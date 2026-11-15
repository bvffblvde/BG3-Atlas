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

local function register()
    if registered then
        return
    end
    local props = {
        Title = { Type = "String" },
        AllText = { Type = "String" },
        NoneText = { Type = "String" },
        FoundText = { Type = "String" },
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
    }
    for _, cat in ipairs(Points.Categories) do
        props["Label_" .. cat] = { Type = "String" }
        props["Count_" .. cat] = { Type = "String" }
        props["Alpha_" .. cat] = { Type = "Single" }
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
    vm.Title = text.title
    vm.AllText = text.all
    vm.NoneText = text.none
    vm.FoundText = Settings.HideFound() and text.showFound or text.hideFound
    vm.Query = BG3Atlas.Search.Query()
    vm.SearchHint = BG3Atlas.Search.Hint()
    local counts = Points.Counts()
    local byCategory = Points.ByCategory()
    for _, cat in ipairs(Points.Categories) do
        local done = 0
        for _, pt in ipairs(byCategory[cat] or {}) do
            if BG3Atlas.Found.IsFound(pt.id) then
                done = done + 1
            end
        end
        vm["Label_" .. cat] = text[cat] or cat
        vm["Count_" .. cat] = done .. "/" .. (counts[cat] or 0)
        vm["Alpha_" .. cat] = Settings.IsEnabled(cat) and 1.0 or 0.35
    end
    vm.ToggleFound:SetHandler(function()
        Settings.SetHideFound(not Settings.HideFound())
        Settings.Save()
        dirty = true
    end)
    vm.Toggle:SetHandler(function(_, param)
        local cat = paramString(param)
        Settings.SetEnabled(cat, not Settings.IsEnabled(cat))
        Settings.Save()
        dirty = true
    end)
    vm.ShowAll:SetHandler(function()
        Settings.SetAll(Points.Categories, true)
        Settings.Save()
        dirty = true
    end)
    vm.HideAll:SetHandler(function()
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

function Panel.MarkDirty()
    dirty = true
end
