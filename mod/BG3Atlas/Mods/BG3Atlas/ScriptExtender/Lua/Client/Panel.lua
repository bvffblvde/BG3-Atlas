local P = BG3Atlas.Probe
local Settings = BG3Atlas.Settings
local Points = BG3Atlas.Points

local Panel = {}
BG3Atlas.Panel = Panel


local registered = false
local version = 1
local applied = {}
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
        ToggleMarkText = { Type = "String" },
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

local searchFocused = false

function Panel.SearchFocused()
    return searchFocused
end

local function fillModel(vm)
    local text = BG3Atlas.Locale.Text(Settings.Language())
    P.Set(vm, "Title", text.title)
    P.Set(vm, "AllText", text.all)
    P.Set(vm, "NoneText", text.none)
    P.Set(vm, "FoundText", Settings.HideFound() and text.showFound or text.hideFound)
    P.Set(vm, "FogText", Settings.FogOnly() and text.fogOn or text.fogOff)
    if P.Get(vm, "Query") ~= BG3Atlas.Search.Query() then
        P.Set(vm, "Query", BG3Atlas.Search.Query())
    end
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
    P.Set(vm, "ToggleMarkText", text.toggleMark)
end

local function newModel(player)
    local vm = Ext.UI.Instantiate("BG3A_Panel")
    fillModel(vm)
    local n = #Points.Categories
    P.Handle(vm, "PadPrev", function()
        selected = (selected - 2) % n + 1
        version = version + 1
    end)
    P.Handle(vm, "PadNext", function()
        selected = selected % n + 1
        version = version + 1
    end)
    P.Handle(vm, "PadUp", function()
        selected = (selected - 3) % n + 1
        version = version + 1
    end)
    P.Handle(vm, "PadDown", function()
        selected = (selected + 1) % n + 1
        version = version + 1
    end)
    P.Handle(vm, "PadToggle", function()
        local cat = Points.Categories[selected]
        if cat then
            Settings.SetEnabled(cat, not Settings.IsEnabled(cat))
            Settings.Save()
            version = version + 1
        end
    end)
    P.Handle(vm, "ToggleFog", function()
        Settings.SetFogOnly(not Settings.FogOnly())
        Settings.Save()
        if BG3Atlas.Layer then
            BG3Atlas.Layer.ForceRebuild()
        end
        version = version + 1
    end)
    P.Handle(vm, "ToggleFound", function()
        Settings.SetHideFound(not Settings.HideFound())
        Settings.Save()
        version = version + 1
    end)
    P.Handle(vm, "Toggle", function(_, param)
        local cat = paramString(param)
        Settings.SetEnabled(cat, not Settings.IsEnabled(cat))
        Settings.Save()
        P.Log("panel toggle " .. P.Str(cat) .. " -> " .. tostring(Settings.IsEnabled(cat)))
        version = version + 1
    end)
    P.Handle(vm, "ShowAll", function()
        Settings.SetAll(Points.Categories, true)
        Settings.Save()
        version = version + 1
    end)
    P.Handle(vm, "HideAll", function()
        Settings.SetAll(Points.Categories, false)
        Settings.Save()
        version = version + 1
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

local panelNodes = {}

function Panel.Reset()
    panelNodes = {}
end

function Panel.Update(widget, player)
    register()
    panelNodes[player or 1] = widget
    local panel = findPanel(widget, 0)
    if not panel then
        return false
    end
    local dc = P.Get(panel, "DataContext")
    local ours = dc and P.Str(P.Get(dc, "Type")):find("BG3A_Panel", 1, true)
    local key = player or 1
    if not ours then
        panel.DataContext = newModel(key)
        applied[key] = version
    elseif applied[key] ~= version then
        fillModel(dc)
        applied[key] = version
    end
    local box = findNamed(panel, "BG3A_SearchBox", 0)
    searchFocused = box ~= nil and P.Get(box, "IsKeyboardFocused") == true
    local info = findNamed(panel, "BG3A_SearchInfo", 0)
    local hint = BG3Atlas.Search.Hint()
    if info and P.Get(info, "Text") ~= hint then
        info.Text = hint
    end
    return true
end

function Panel.SetCursorInfo(player, text)
    local widget = panelNodes[player or 1]
    local info = widget and findNamed(widget, "BG3A_CursorInfo", 0)
    if not info then
        return false
    end
    return P.Set(info, "Text", text)
end

function Panel.MarkDirty()
    version = version + 1
end
