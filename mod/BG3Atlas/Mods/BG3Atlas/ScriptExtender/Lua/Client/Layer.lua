local P = BG3Atlas.Probe
local Settings = BG3Atlas.Settings
local Points = BG3Atlas.Points

local Layer = {}
BG3Atlas.Layer = Layer

Layer.IconPixels = { JournalMap = 40, JournalMap_c = 40, Minimap = 32 }
Layer.IconUnits = 24
Layer.PeriodMs = 250
Layer.Widgets = { JournalMap = true, JournalMap_c = true, Minimap = true }

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
        Id = { Type = "String" },
        Label = { Type = "String" },
        Mark = { Type = "Command" },
    })
    local props = { Search = { Type = "Collection" } }
    for _, cat in ipairs(Points.Categories) do
        props["Cat_" .. cat] = { Type = "Collection" }
        props["Found_" .. cat] = { Type = "Collection" }
    end
    Ext.UI.RegisterType("BG3A_Layer", props)
    registered = true
end

local flagText = {
    ru = { [1] = "заперто", [2] = "ловушка", [4] = "спрятано", found = "найдено", click = "клик: отметить" },
    en = { [1] = "locked", [2] = "trapped", [4] = "hidden", found = "found", click = "click to mark" },
}

local function pointLabel(pt, found)
    local lang = Settings.Language()
    local text = flagText[lang]
    local name = lang == "ru" and pt.nameRu or pt.name
    local extra = {}
    for _, bit in ipairs({ 1, 2, 4 }) do
        if pt.flags and (pt.flags & bit) ~= 0 then
            extra[#extra + 1] = text[bit]
        end
    end
    if found then
        extra[#extra + 1] = text.found
    end
    local label = name
    if #extra > 0 then
        label = label .. " (" .. table.concat(extra, ", ") .. ")"
    end
    return label
end

local function newPoint(pt, found)
    local p = Ext.UI.Instantiate("BG3A_Point")
    p.PosX = pt.x
    p.PosY = pt.y
    p.Id = pt.id
    p.Label = pointLabel(pt, found)
    local id = pt.id
    p.Mark:SetHandler(function()
        BG3Atlas.Found.SetFound(id, not BG3Atlas.Found.IsFound(id))
    end)
    return p
end

local placed = {}
local syncedVersion = -1
local searchVersion = -1
local viewKey = "surface"
local rebuild = false

local function inView(pt)
    return BG3Atlas.Submaps.Key(pt.submap, pt.floor) == viewKey
end

local function playerPos()
    for _, e in ipairs(Ext.Entity.GetAllEntitiesWithComponent("ClientControl")) do
        if P.Get(e, "ClientCharacter") then
            return P.Pos(e)
        end
    end
    return nil
end

local function updateView()
    local pos = playerPos()
    if not pos then
        return
    end
    local key = BG3Atlas.Submaps.Key(BG3Atlas.Submaps.Assign(pos[1], pos[2], pos[3]))
    if key ~= viewKey then
        viewKey = key
        rebuild = true
        P.Log("map view: " .. key)
    end
end

local function newModel()
    local vm = Ext.UI.Instantiate("BG3A_Layer")
    local total = 0
    placed = {}
    for cat, list in pairs(Points.ByCategory()) do
        local active = vm["Cat_" .. cat]
        local done = vm["Found_" .. cat]
        for _, pt in ipairs(list) do
            if not inView(pt) then
                goto continue
            end
            local isFound = BG3Atlas.Found.IsFound(pt.id)
            local coll = isFound and done or active
            coll[#coll + 1] = newPoint(pt, isFound)
            placed[pt.id] = isFound
            total = total + 1
            ::continue::
        end
    end
    syncedVersion = BG3Atlas.Found.Version()
    searchVersion = -1
    return vm, total
end

local function removeById(coll, id)
    for i = #coll, 1, -1 do
        local item = coll[i]
        if item and P.Get(item, "Id") == id then
            coll[i] = nil
            return true
        end
    end
    return false
end

local function syncSearch(vm)
    local version = BG3Atlas.Search.Version()
    if version == searchVersion then
        return
    end
    searchVersion = version
    local coll = vm.Search
    for i = #coll, 1, -1 do
        coll[i] = nil
    end
    for _, pt in ipairs(BG3Atlas.Search.Results()) do
        if not inView(pt) then
            goto continue
        end
        coll[#coll + 1] = newPoint(pt, BG3Atlas.Found.IsFound(pt.id))
        ::continue::
    end
end

local function syncFound(vm)
    local version = BG3Atlas.Found.Version()
    if version == syncedVersion then
        return
    end
    syncedVersion = version
    local moved = 0
    for cat, list in pairs(Points.ByCategory()) do
        for _, pt in ipairs(list) do
            local isFound = BG3Atlas.Found.IsFound(pt.id)
            if placed[pt.id] ~= nil and placed[pt.id] ~= isFound then
                local from = vm[(isFound and "Cat_" or "Found_") .. cat]
                local to = vm[(isFound and "Found_" or "Cat_") .. cat]
                removeById(from, pt.id)
                to[#to + 1] = newPoint(pt, isFound)
                placed[pt.id] = isFound
                moved = moved + 1
            end
        end
    end
    if moved > 0 and BG3Atlas.Panel then
        BG3Atlas.Panel.MarkDirty()
    end
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
            local entry = { widget = wname, node = widget }
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
        local kind, cat = nil, nil
        if name then
            kind, cat = name:match("^BG3A_(%a+)_(.+)$")
        end
        if kind == "Cat" then
            setVisible(c, Settings.IsEnabled(cat))
        elseif kind == "Found" then
            setVisible(c, Settings.IsEnabled(cat) and not Settings.HideFound())
        end
    end
end

local function update()
    register()
    updateView()
    local found = findMaps()
    local shared = nil
    local forced = rebuild
    rebuild = false
    for _, entry in ipairs(found) do
        if not forced and entry.layer and isOurs(P.Get(entry.layer, "DataContext")) then
            shared = P.Get(entry.layer, "DataContext")
            break
        end
    end
    if shared then
        syncFound(shared)
        syncSearch(shared)
    end
    for _, entry in ipairs(found) do
        if entry.layer then
            local model = models[entry.widget] or {}
            models[entry.widget] = model
            if forced or not isOurs(P.Get(entry.layer, "DataContext")) then
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
            if (entry.widget == "JournalMap" or entry.widget == "JournalMap_c") and BG3Atlas.Panel then
                BG3Atlas.Panel.Update(entry.node)
            end
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
    Layer.IconPixels.JournalMap_c = Layer.IconPixels.JournalMap
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
    if BG3Atlas.Panel then
        BG3Atlas.Panel.MarkDirty()
    end
    P.Log(cat .. " " .. (Settings.IsEnabled(cat) and "on" or "off"))
end

local function cmdAll(_, mode)
    Settings.SetAll(Points.Categories, mode ~= "off")
    Settings.Save()
    if BG3Atlas.Panel then
        BG3Atlas.Panel.MarkDirty()
    end
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
