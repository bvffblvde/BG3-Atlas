local P = BG3Atlas.Probe
local Settings = BG3Atlas.Settings
local Points = BG3Atlas.Points

local Panel = {}
BG3Atlas.Panel = Panel

local labels = {
    ru = {
        title = "Атлас",
        all = "Все",
        none = "Скрыть",
        hideFound = "Скрыть найденное",
        showFound = "Показать найденное",
        fogOn = "Показать везде",
        fogOff = "Только исследованное",
        padHint = "Стрелки: выбор, подтвердить: показать или скрыть",
        chest = "Сундуки",
        weapon_unique = "Оружие",
        armor_unique = "Броня",
        accessory = "Аксессуары",
        scroll = "Свитки",
        book = "Книги и записки",
        key = "Ключи",
        ingredient = "Ингредиенты",
        valuable = "Ценности",
        trap = "Ловушки",
        hidden_stash = "Тайники",
        lever = "Рычаги и кнопки",
        locked_door = "Запертые двери",
        waypoint = "Рунные круги",
        trader = "Торговцы",
        quest_npc = "Персонажи",
        boss = "Боссы",
        animal = "Животные",
    },
    en = {
        title = "Atlas",
        all = "All",
        none = "Hide",
        hideFound = "Hide found",
        showFound = "Show found",
        fogOn = "Show everywhere",
        fogOff = "Explored only",
        padHint = "D-pad: select, accept: show or hide",
        chest = "Containers",
        weapon_unique = "Weapons",
        armor_unique = "Armour",
        accessory = "Accessories",
        scroll = "Scrolls",
        book = "Books and notes",
        key = "Keys",
        ingredient = "Ingredients",
        valuable = "Valuables",
        trap = "Traps",
        hidden_stash = "Hidden stashes",
        lever = "Levers and buttons",
        locked_door = "Locked doors",
        waypoint = "Waypoints",
        trader = "Traders",
        quest_npc = "Characters",
        boss = "Bosses",
        animal = "Animals",
    },
}

local registered = false
local dirty = true
local selected = 1

local function register()
    if registered then
        return
    end
    local props = {
        Title = { Type = "String" },
        AllText = { Type = "String" },
        NoneText = { Type = "String" },
        FoundText = { Type = "String" },
        FogText = { Type = "String" },
        ToggleFog = { Type = "Command" },
        SearchHint = { Type = "String" },
        Query = {
            Type = "String",
            WriteCallback = function(obj)
                local ok, value = pcall(function()
                    return obj.Query
                end)
                if ok then
                    BG3Atlas.Search.Set(value)
                end
            end,
        },
        Toggle = { Type = "Command" },
        ShowAll = { Type = "Command" },
        HideAll = { Type = "Command" },
        ToggleFound = { Type = "Command" },
        PadHint = { Type = "String" },
        PadPrev = { Type = "Command" },
        PadNext = { Type = "Command" },
        PadToggle = { Type = "Command" },
        PadUp = { Type = "Command" },
        PadDown = { Type = "Command" },
    }
    for _, cat in ipairs(Points.Categories) do
        props["Label_" .. cat] = { Type = "String" }
        props["Count_" .. cat] = { Type = "String" }
        props["Alpha_" .. cat] = { Type = "Single" }
        props["Sel_" .. cat] = { Type = "Single" }
    end
    Ext.UI.RegisterType("BG3A_Panel", props)
    registered = true
end

local function paramString(param)
    if type(param) == "string" then
        return param
    end
    local ok, s = pcall(function()
        return param:ToString()
    end)
    if ok and type(s) == "string" then
        return s
    end
    return P.Str(param)
end

local function newModel()
    local text = labels[Settings.Language()]
    local vm = Ext.UI.Instantiate("BG3A_Panel")
    P.Set(vm, "Title", text.title)
    P.Set(vm, "AllText", text.all)
    P.Set(vm, "NoneText", text.none)
    P.Set(vm, "FoundText", Settings.HideFound() and text.showFound or text.hideFound)
    P.Set(vm, "FogText", Settings.FogOnly() and text.fogOn or text.fogOff)
    P.Set(vm, "Query", BG3Atlas.Search.Query())
    P.Set(vm, "SearchHint", BG3Atlas.Search.Hint())
    local map = BG3Atlas.Layer and BG3Atlas.Layer.CurrentMap()
    local counts = Points.Counts(map)
    local byCategory = Points.ByCategory()
    for _, cat in ipairs(Points.Categories) do
        local done = 0
        for _, pt in ipairs(byCategory[cat] or {}) do
            if pt.map == map and BG3Atlas.Found.IsFound(pt.id) then
                done = done + 1
            end
        end
        P.Set(vm, "Label_" .. cat, text[cat] or cat)
        P.Set(vm, "Count_" .. cat, done .. "/" .. (counts[cat] or 0))
        P.Set(vm, "Alpha_" .. cat, Settings.IsEnabled(cat) and 1.0 or 0.35)
    end
    for i, cat in ipairs(Points.Categories) do
        P.Set(vm, "Sel_" .. cat, (i == selected) and 1.0 or 0.0)
    end
    P.Set(vm, "PadHint", text.padHint)
    local n = #Points.Categories
    P.Handle(vm, "PadPrev", function()
        selected = (selected - 2) % n + 1
        dirty = true
    end)
    P.Handle(vm, "PadNext", function()
        selected = selected % n + 1
        dirty = true
    end)
    P.Handle(vm, "PadUp", function()
        selected = (selected - 3) % n + 1
        dirty = true
    end)
    P.Handle(vm, "PadDown", function()
        selected = (selected + 1) % n + 1
        dirty = true
    end)
    P.Handle(vm, "PadToggle", function()
        local cat = Points.Categories[selected]
        if cat then
            Settings.SetEnabled(cat, not Settings.IsEnabled(cat))
            Settings.Save()
            dirty = true
        end
    end)
    P.Handle(vm, "ToggleFog", function()
        Settings.SetFogOnly(not Settings.FogOnly())
        Settings.Save()
        if BG3Atlas.Layer then
            BG3Atlas.Layer.ForceRebuild()
        end
        dirty = true
    end)
    P.Handle(vm, "ToggleFound", function()
        Settings.SetHideFound(not Settings.HideFound())
        Settings.Save()
        dirty = true
    end)
    P.Handle(vm, "Toggle", function(_, param)
        local cat = paramString(param)
        Settings.SetEnabled(cat, not Settings.IsEnabled(cat))
        Settings.Save()
        dirty = true
    end)
    P.Handle(vm, "ShowAll", function()
        Settings.SetAll(Points.Categories, true)
        Settings.Save()
        dirty = true
    end)
    P.Handle(vm, "HideAll", function()
        Settings.SetAll(Points.Categories, false)
        Settings.Save()
        dirty = true
    end)
    return vm
end

local function findNamed(node, name, depth)
    if not node or depth > 20 then
        return nil
    end
    if P.Get(node, "Name") == name then
        return node
    end
    local count = P.Get(node, "VisualChildrenCount") or 0
    for i = 1, count do
        local ok, c = pcall(function()
            return node:VisualChild(i)
        end)
        if ok and c then
            local found = findNamed(c, name, depth + 1)
            if found then
                return found
            end
        end
    end
    return nil
end

local function findPanel(node, depth)
    if not node or depth > 30 then
        return nil
    end
    if P.Get(node, "Name") == "BG3A_Panel" then
        return node
    end
    if P.Str(P.Get(node, "Type")) == "ls.LSWorldMap" then
        return nil
    end
    local count = P.Get(node, "VisualChildrenCount") or 0
    for i = 1, count do
        local ok, c = pcall(function()
            return node:VisualChild(i)
        end)
        if ok and c then
            local found = findPanel(c, depth + 1)
            if found then
                return found
            end
        end
    end
    return nil
end

function Panel.Update(widget)
    register()
    local panel = findPanel(widget, 0)
    if not panel then
        return false
    end
    local dc = P.Get(panel, "DataContext")
    local ours = dc and P.Str(P.Get(dc, "Type")):find("BG3A_Panel", 1, true)
    if dirty or not ours then
        panel.DataContext = newModel()
        dirty = false
    end
    local info = findNamed(panel, "BG3A_SearchInfo", 0)
    local hint = BG3Atlas.Search.Hint()
    if info and P.Get(info, "Text") ~= hint then
        info.Text = hint
    end
    return true
end

function Panel.SetCursorInfo(widget, text)
    local info = findNamed(widget, "BG3A_CursorInfo", 0)
    if not info then
        return false
    end
    return P.Set(info, "Text", text)
end

function Panel.MarkDirty()
    dirty = true
end
