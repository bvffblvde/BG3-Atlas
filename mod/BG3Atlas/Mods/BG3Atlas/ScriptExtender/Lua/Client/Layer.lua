local P = BG3Atlas.Probe

local Layer = {}
BG3Atlas.Layer = Layer

Layer.Points = {
    { "S_DEN_SmokepowderTrap_002", 212.35, 425.93 },
    { "S_DEN_SmokepowderTrap_001", 206.21, 430.37 },
    { "S_DEN_NarrativeLoot_AnsursFinestRejection", 211.30, 433.90 },
    { "S_DEN_Gate", 208.59, 439.47 },
    { "S_DEN_GateMechanism", 206.05, 441.27 },
    { "S_DEN_BattleHorn", 201.84, 441.82 },
    { "S_DEN_AttackOnDen_GoblinBarrel_001", 204.75, 416.80 },
    { "S_DEN_KanonBag", 180.74, 440.35 },
    { "S_DEN_WeaponStandCrate", 181.53, 443.31 },
    { "TOOL_GEN_Shovel_A_002", 185.70, 446.08 },
}

Layer.MapOrigin = { x = -1200, z = 917.5 }
Layer.IconPixels = { JournalMap = 26, Minimap = 14 }
Layer.PeriodMs = 250
Layer.Widgets = { JournalMap = true, Minimap = true }

local registered = false
local models = {}
local logged = {}
local running = false

local function logOnce(key, msg)
    if not logged[key] then
        logged[key] = true
        P.Log(msg)
    end
end

local function toMap(x, z)
    return x - Layer.MapOrigin.x, Layer.MapOrigin.z - z
end

local function register()
    if registered then
        return
    end
    Ext.UI.RegisterType("BG3A_Point", {
        PosX = { Type = "Single" },
        PosY = { Type = "Single" },
        Name = { Type = "String" },
        Kind = { Type = "String" },
    })
    Ext.UI.RegisterType("BG3A_Layer", {
        Points = { Type = "Collection" },
    })
    registered = true
end

local function newPoint(name, x, z, kind)
    local p = Ext.UI.Instantiate("BG3A_Point")
    local mx, my = toMap(x, z)
    p.Name = name
    p.PosX = mx
    p.PosY = my
    p.Kind = kind
    return p
end

local function newModel()
    local vm = Ext.UI.Instantiate("BG3A_Layer")
    local list = vm.Points
    local n = 0
    for _, def in ipairs(Layer.Points) do
        n = n + 1
        list[n] = newPoint(def[1], def[2], def[3], "Point")
    end
    list[n + 1] = newPoint("Player", 0, 0, "Player")
    return vm, n + 1
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

local function playerPos()
    for _, e in ipairs(Ext.Entity.GetAllEntitiesWithComponent("ClientControl")) do
        if P.Get(e, "ClientCharacter") then
            return P.Pos(e)
        end
    end
    return nil
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

local function updateScale(entry)
    local mapScale = P.Get(entry.map, "MapScale")
    local imageW = entry.image and P.Get(entry.image, "ActualWidth")
    local worldW = worldWidth(entry)
    if not mapScale or not imageW or imageW <= 0 or not worldW then
        return
    end
    local px = Layer.IconPixels[entry.widget] or 20
    local scale = px * worldW / (mapScale * imageW)
    local model = models[entry.widget]
    if not model.scale or math.abs(model.scale - scale) / scale > 0.01 then
        model.scale = scale
        entry.map.Tag = Ext.UI.Box(scale + 0.0)
    end
end

local function update()
    register()
    local pos = playerPos()
    for _, entry in ipairs(findMaps()) do
        if entry.layer then
            local model = models[entry.widget] or {}
            models[entry.widget] = model
            local dc = P.Get(entry.layer, "DataContext")
            if not dc or not P.Str(P.Get(dc, "Type")):find("BG3A_Layer", 1, true) then
                local vm, playerIndex = newModel()
                entry.layer.DataContext = vm
                model.playerIndex = playerIndex
                model.lastPos = nil
                model.scale = nil
                dc = vm
                P.Log("layer attached to " .. entry.widget)
            end
            local last = model.lastPos
            if pos and (not last or math.abs(last[1] - pos[1]) + math.abs(last[2] - pos[3]) > 0.5) then
                model.lastPos = { pos[1], pos[3] }
                dc.Points[model.playerIndex] = newPoint("Player", pos[1], pos[3], "Player")
            end
            updateScale(entry)
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

local function describe(node)
    local parts = { P.Str(P.Get(node, "Type")) }
    local name = P.Get(node, "Name")
    if name and name ~= "" then
        parts[#parts + 1] = "#" .. P.Str(name)
    end
    for _, k in ipairs({ "ActualWidth", "ActualHeight", "Tag" }) do
        local v = P.Get(node, k)
        if v ~= nil then
            parts[#parts + 1] = k .. "=" .. P.Str(v)
        end
    end
    local dc = P.Get(node, "DataContext")
    if dc then
        local px, py = P.Get(dc, "PosX"), P.Get(dc, "PosY")
        if px then
            parts[#parts + 1] = "Pos=" .. P.Str(px) .. "," .. P.Str(py)
        end
    end
    return table.concat(parts, " ")
end

local function cmdLayerDump()
    Ext.UI.Defer(function()
        local lines = {}
        for _, entry in ipairs(findMaps()) do
            lines[#lines + 1] = "## " .. entry.widget .. " MapScale=" .. P.Str(P.Get(entry.map, "MapScale")) .. " worldW=" .. P.Str(worldWidth(entry)) .. " " .. describe(entry.map)
            if entry.image then
                lines[#lines + 1] = "image " .. describe(entry.image)
            end
            if entry.layer then
                lines[#lines + 1] = "layer " .. describe(entry.layer)
            end
        end
        P.Save("layer_dump.txt", lines)
    end)
end

local function cmdIconPx(_, journal, minimap)
    Layer.IconPixels.JournalMap = tonumber(journal) or Layer.IconPixels.JournalMap
    Layer.IconPixels.Minimap = tonumber(minimap) or Layer.IconPixels.Minimap
    for _, m in pairs(models) do
        m.scale = nil
    end
    P.Log("icon pixels journal=" .. Layer.IconPixels.JournalMap .. " minimap=" .. Layer.IconPixels.Minimap)
end

Ext.RegisterConsoleCommand("atlas_layerdump", cmdLayerDump)
Ext.RegisterConsoleCommand("atlas_iconpx", cmdIconPx)
Ext.RegisterConsoleCommand("atlas_layer_stop", Layer.Stop)
Ext.RegisterConsoleCommand("atlas_layer_start", Layer.Start)

Ext.Events.SessionLoaded:Subscribe(function()
    Layer.Start()
end)
