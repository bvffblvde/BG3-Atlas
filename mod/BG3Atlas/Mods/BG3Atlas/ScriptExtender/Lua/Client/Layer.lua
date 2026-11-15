local P = BG3Atlas.Probe
local Settings = BG3Atlas.Settings
local Points = BG3Atlas.Points

local Layer = {}
BG3Atlas.Layer = Layer

Layer.IconPixels = { JournalMap = 40, Minimap = 32 }
Layer.IconUnits = 24
Layer.PeriodMs = 250
Layer.Widgets = { JournalMap = true, Minimap = true }

local registered = false
local models = {}
local logged = {}
local running = false
local visibilityMode = nil

local function logOnce(key, msg)
    if not logged[key] then
        logged[key] = true
        P.Log(msg)
    end
end

local function register()
    if registered then
        return
    end
    Ext.UI.RegisterType("BG3A_Point", {
        PosX = { Type = "Single" },
        PosY = { Type = "Single" },
        Name = { Type = "String" },
    })
    local props = {}
    for _, cat in ipairs(Points.Categories) do
        props["Cat_" .. cat] = { Type = "Collection" }
    end
    Ext.UI.RegisterType("BG3A_Layer", props)
    registered = true
end

local function newModel()
    local vm = Ext.UI.Instantiate("BG3A_Layer")
    local total = 0
    for cat, list in pairs(Points.ByCategory()) do
        local coll = vm["Cat_" .. cat]
        for i, pt in ipairs(list) do
            local p = Ext.UI.Instantiate("BG3A_Point")
            p.PosX = pt.x
            p.PosY = pt.y
            p.Name = pt.name
            coll[i] = p
        end
        total = total + #list
    end
    return vm, total
end

local function children(node)
    local out = {}
    local count = P.Get(node, "VisualChildrenCount") or 0
    for i = 1, count do
        local ok, c = pcall(function()
            return node:VisualChild(i)
        end)
        if ok and c then
            out[#out + 1] = c
        end
    end
    return out
end

local skip = { PART_MarkerHolder = true, ShroudedRooms = true, SemiShroudedRooms = true, RegionsContainer = true, CurrentBuilding = true }

local function findMap(node, depth, entry)
    if not node or depth > 40 or (entry.map and entry.layer) then
        return
    end
    local name = P.Get(node, "Name")
    if not entry.map and P.Str(P.Get(node, "Type")) == "ls.LSWorldMap" then
        entry.map = node
    end
    if name == "BG3A_Layer" then
        entry.layer = node
        return
    elseif name == "MapImage" then
        entry.image = node
    end
    if name and skip[name] then
        return
    end
    for _, c in ipairs(children(node)) do
        findMap(c, depth + 1, entry)
    end
end

local function findMaps()
    local out = {}
    local ok, content = pcall(function()
        return Ext.UI.GetRoot():Find("ContentRoot")
    end)
    if not ok or not content then
        return out
    end
    for _, widget in ipairs(children(content)) do
        local wname = P.Get(widget, "Name")
        if wname and Layer.Widgets[wname] then
            local entry = { widget = wname }
            findMap(widget, 0, entry)
            if entry.map then
                out[#out + 1] = entry
            end
        end
    end
    return out
end

local function isOurs(dc)
    return dc and P.Str(P.Get(dc, "Type")):find("BG3A_Layer", 1, true) ~= nil
end

local function worldWidth(entry)
    local dc = entry.image and P.Get(entry.image, "DataContext")
    local size = dc and P.Get(dc, "WorldSize")
    local w = size and (P.Get(size, 1) or P.Get(size, "x"))
    if type(w) == "number" and w > 0 then
        return w
    end
    return nil
end

local function updateScale(entry, model)
    local mapScale = P.Get(entry.map, "MapScale")
    local imageW = entry.image and P.Get(entry.image, "ActualWidth")
    local worldW = worldWidth(entry)
    if not mapScale or mapScale <= 0 or not imageW or imageW <= 0 or not worldW then
        return
    end
    local px = Layer.IconPixels[entry.widget] or 32
    local scale = px * worldW / (mapScale * imageW) / Layer.IconUnits
    if not model.scale or math.abs(model.scale - scale) / scale > 0.01 then
        model.scale = scale
        entry.map.MinWidth = scale
    end
end

local function setVisible(node, on)
    if visibilityMode ~= "opacity" then
        local want = on and "Visible" or "Collapsed"
        if P.Str(P.Get(node, "Visibility")) == want then
            return
        end
        local ok, err = pcall(function()
            node.Visibility = want
        end)
        if ok then
            visibilityMode = "visibility"
            return
        end
        logOnce("vis", "Visibility not writable, using Opacity: " .. P.Str(err))
        visibilityMode = "opacity"
    end
    local alpha = on and 1.0 or 0.0
    if P.Get(node, "Opacity") ~= alpha then
        node.Opacity = alpha
    end
end

local function updateFilters(entry)
    for _, c in ipairs(children(entry.layer)) do
        local name = P.Get(c, "Name")
        local cat = name and name:match("^BG3A_Cat_(.+)$")
        if cat then
            setVisible(c, Settings.IsEnabled(cat))
        end
    end
end

local function update()
    register()
    local found = findMaps()
    local shared = nil
    for _, entry in ipairs(found) do
        if entry.layer and isOurs(P.Get(entry.layer, "DataContext")) then
            shared = P.Get(entry.layer, "DataContext")
            break
        end
    end
    for _, entry in ipairs(found) do
        if entry.layer then
            local model = models[entry.widget] or {}
            models[entry.widget] = model
            if not isOurs(P.Get(entry.layer, "DataContext")) then
                if not shared then
                    local vm, total = newModel()
                    shared = vm
                    P.Log("layer model built: " .. total .. " points")
                end
                entry.layer.DataContext = shared
                model.scale = nil
                P.Log("layer attached to " .. entry.widget)
            end
            updateScale(entry, model)
            updateFilters(entry)
        else
            logOnce("nolayer", "LSWorldMap found without BG3A_Layer: theme override not applied")
        end
    end
end

local function loop()
    if not running then
        return
    end
    Ext.UI.Defer(function()
        local ok, err = pcall(update)
        if not ok then
            local msg = P.Str(err)
            logOnce(msg, "layer update failed: " .. msg)
        end
    end)
    Ext.Timer.WaitForRealtime(Layer.PeriodMs, loop)
end

function Layer.Start()
    if running then
        return
    end
    running = true
    P.Log("layer started")
    loop()
end

function Layer.Stop()
    running = false
    P.Log("layer stopped")
end

function Layer.Refresh()
    for _, m in pairs(models) do
        m.scale = nil
    end
end

local function cmdIconPx(_, journal, minimap)
    Layer.IconPixels.JournalMap = tonumber(journal) or Layer.IconPixels.JournalMap
    Layer.IconPixels.Minimap = tonumber(minimap) or Layer.IconPixels.Minimap
    Layer.Refresh()
    P.Log("icon size journal=" .. Layer.IconPixels.JournalMap .. " minimap=" .. Layer.IconPixels.Minimap)
end

local function cmdToggle(_, cat)
    if not cat then
        P.Log("usage: !atlas_toggle <category>, categories: " .. table.concat(Points.Categories, " "))
        return
    end
    Settings.SetEnabled(cat, not Settings.IsEnabled(cat))
    Settings.Save()
    P.Log(cat .. " " .. (Settings.IsEnabled(cat) and "on" or "off"))
end

local function cmdAll(_, mode)
    Settings.SetAll(Points.Categories, mode ~= "off")
    Settings.Save()
    P.Log("all categories " .. (mode ~= "off" and "on" or "off"))
end

local function cmdLayerDump()
    Ext.UI.Defer(function()
        local lines = {}
        for _, entry in ipairs(findMaps()) do
            lines[#lines + 1] = "## " .. entry.widget .. " MapScale=" .. P.Str(P.Get(entry.map, "MapScale")) .. " MinWidth=" .. P.Str(P.Get(entry.map, "MinWidth")) .. " worldW=" .. P.Str(worldWidth(entry))
            if entry.layer then
                for _, c in ipairs(children(entry.layer)) do
                    lines[#lines + 1] = "  " .. P.Str(P.Get(c, "Name")) .. " Visibility=" .. P.Str(P.Get(c, "Visibility")) .. " Opacity=" .. P.Str(P.Get(c, "Opacity"))
                end
            end
        end
        P.Save("layer_dump.txt", lines)
    end)
end

Ext.RegisterConsoleCommand("atlas_layerdump", cmdLayerDump)
Ext.RegisterConsoleCommand("atlas_iconpx", cmdIconPx)
Ext.RegisterConsoleCommand("atlas_toggle", cmdToggle)
Ext.RegisterConsoleCommand("atlas_all", cmdAll)
Ext.RegisterConsoleCommand("atlas_layer_stop", Layer.Stop)
Ext.RegisterConsoleCommand("atlas_layer_start", Layer.Start)

Ext.Events.SessionLoaded:Subscribe(function()
    Layer.Start()
end)
