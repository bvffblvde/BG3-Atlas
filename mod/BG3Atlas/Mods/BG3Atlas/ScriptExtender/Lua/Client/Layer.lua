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

Layer.IconPixels = 40
Layer.IconK = 1.0
Layer.PeriodMs = 250

local registered = false
local models = {}
local logged = {}
local running = false

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
    p.Name = name
    p.PosX = x
    p.PosY = z
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
    list[n + 1] = newPoint("PlayerA", 0, 0, "PlayerA")
    list[n + 2] = newPoint("PlayerB", 0, 0, "PlayerB")
    return vm, n + 1
end

local skip = { PART_MarkerHolder = true, ShroudedRooms = true, SemiShroudedRooms = true, RegionsContainer = true, CurrentBuilding = true }

local function findMaps(node, depth, out)
    if not node or depth > 60 then
        return
    end
    local typ = P.Str(P.Get(node, "Type"))
    if typ == "ls.LSWorldMap" then
        out[#out + 1] = { map = node }
    end
    local name = P.Get(node, "Name")
    if name == "BG3A_Layer" and #out > 0 then
        out[#out].layer = node
        return
    elseif name == "MapImage" and #out > 0 then
        out[#out].image = node
    end
    if name and skip[name] then
        return
    end
    local count = P.Get(node, "VisualChildrenCount") or 0
    for i = 1, count do
        local ok, child = pcall(function()
            return node:VisualChild(i)
        end)
        if ok and child then
            findMaps(child, depth + 1, out)
        end
    end
end

local function playerPos()
    local list = Ext.Entity.GetAllEntitiesWithComponent("ClientControl")
    for _, e in ipairs(list) do
        if P.Get(e, "ClientCharacter") then
            return P.Pos(e)
        end
    end
    return nil
end

local function mapKey(entry)
    local w = P.Get(entry.map, "ActualWidth") or 0
    local h = P.Get(entry.map, "ActualHeight") or 0
    return string.format("%dx%d", w, h)
end

local function update()
    register()
    local found = {}
    findMaps(Ext.UI.GetRoot(), 0, found)
    local pos = playerPos()
    for _, entry in ipairs(found) do
        if entry.layer then
            local key = mapKey(entry)
            local model = models[key] or {}
            models[key] = model
            local dc = P.Get(entry.layer, "DataContext")
            if not dc or not P.Str(P.Get(dc, "Type")):find("BG3A_Layer", 1, true) then
                local vm, playerIndex = newModel()
                entry.layer.DataContext = vm
                model.playerIndex = playerIndex
                model.lastPos = nil
                dc = vm
                P.Log("layer DataContext set for map " .. key)
            end
            local last = model.lastPos
            if pos and model.playerIndex and (not last or math.abs(last[1] - pos[1]) + math.abs(last[2] - pos[3]) > 0.5) then
                model.lastPos = { pos[1], pos[3] }
                dc.Points[model.playerIndex] = newPoint("PlayerA", pos[1], pos[3], "PlayerA")
                dc.Points[model.playerIndex + 1] = newPoint("PlayerB", pos[1], -pos[3], "PlayerB")
            end
            local mapScale = P.Get(entry.map, "MapScale") or 1
            local imageW = entry.image and P.Get(entry.image, "ActualWidth") or 0
            local layerW = P.Get(entry.layer, "ActualWidth") or 0
            if not logged[key] then
                logged[key] = true
                P.Log(string.format("layer attached map=%s MapScale=%.3f MapImage.ActualWidth=%.1f layer.ActualWidth=%.1f player=%s", key, mapScale, imageW, layerW, P.FormatPos(pos)))
            end
        elseif not logged["nolayer"] then
            logged["nolayer"] = true
            P.Log("LSWorldMap found without BG3A_Layer: theme override not applied")
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
            if not logged[msg] then
                logged[msg] = true
                P.Log("layer update failed: " .. msg)
            end
        end
    end)
    Ext.Timer.WaitForRealtime(Layer.PeriodMs, loop)
end

function Layer.Start()
    if running then
        return
    end
    running = true
    loop()
end

function Layer.Stop()
    running = false
end

local function describe(node)
    local parts = { P.Str(P.Get(node, "Type")) }
    local name = P.Get(node, "Name")
    if name and name ~= "" then
        parts[#parts + 1] = "#" .. P.Str(name)
    end
    for _, k in ipairs({ "ActualWidth", "ActualHeight", "Visibility", "Opacity" }) do
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
    local rt = P.Get(node, "RenderTransform")
    if rt then
        local ok, props = pcall(function()
            return rt:GetAllProperties()
        end)
        if ok and type(props) == "table" then
            local list = {}
            for k, v in pairs(props) do
                list[#list + 1] = P.Str(k) .. "=" .. P.Str(v)
            end
            table.sort(list)
            parts[#parts + 1] = "RT[" .. P.Str(P.Get(rt, "Type")) .. " " .. table.concat(list, " ") .. "]"
        end
    end
    return table.concat(parts, " ")
end

local function dumpTree(node, depth, lines, budget)
    if not node or budget.n <= 0 or depth > 12 then
        return
    end
    budget.n = budget.n - 1
    lines[#lines + 1] = string.rep("  ", depth) .. describe(node)
    local count = P.Get(node, "VisualChildrenCount") or 0
    for i = 1, count do
        local ok, c = pcall(function()
            return node:VisualChild(i)
        end)
        if ok and c then
            dumpTree(c, depth + 1, lines, budget)
        end
    end
end

local function cmdLayerDump()
    Ext.UI.Defer(function()
        local found = {}
        findMaps(Ext.UI.GetRoot(), 0, found)
        local lines = {}
        for _, entry in ipairs(found) do
            lines[#lines + 1] = "## map " .. mapKey(entry) .. " MapScale=" .. P.Str(P.Get(entry.map, "MapScale")) .. " MapRotation=" .. P.Str(P.Get(entry.map, "MapRotation"))
            local mp = P.Get(entry.map, "MapPos")
            if mp then
                lines[#lines + 1] = "MapPos " .. P.Str(P.Get(mp, "X") or P.Get(mp, 1)) .. " " .. P.Str(P.Get(mp, "Y") or P.Get(mp, 2))
            end
            if entry.image then
                lines[#lines + 1] = "image " .. describe(entry.image)
            end
            if entry.layer then
                dumpTree(entry.layer, 0, lines, { n = 60 })
            end
        end
        P.Save("layer_dump.txt", lines)
    end)
end

local function cmdIconK(_, k)
    Layer.IconK = tonumber(k) or Layer.IconK
    P.Log("IconK = " .. Layer.IconK)
end

local function cmdLayerInfo()
    logged = {}
    P.Log("layer info will be printed on next update")
end

local function cmdCalib()
    Ext.UI.Defer(function()
        local pos = playerPos()
        local function scan(node, depth)
            if not node or depth > 80 then
                return
            end
            if P.Str(P.Get(node, "Type")) == "ls.LSWorldMapMarker" then
                local dc = P.Get(node, "DataContext")
                if dc and P.Str(P.Get(dc, "Type")) == "CharacterParty" then
                    local wp = P.Get(dc, "WorldPos")
                    local parts = {}
                    if type(wp) == "table" or type(wp) == "userdata" then
                        for _, k in ipairs({ 1, 2, 3, "x", "y", "z", "X", "Y", "Z" }) do
                            local v = P.Get(wp, k)
                            if v ~= nil then
                                parts[#parts + 1] = P.Str(k) .. "=" .. P.Str(v)
                            end
                        end
                    end
                    P.Log("party marker WorldPos " .. table.concat(parts, " ") .. " | player " .. P.FormatPos(pos))
                end
            end
            local count = P.Get(node, "VisualChildrenCount") or 0
            for i = 1, count do
                local ok, child = pcall(function()
                    return node:VisualChild(i)
                end)
                if ok and child then
                    scan(child, depth + 1)
                end
            end
        end
        scan(Ext.UI.GetRoot(), 0)
    end)
end

Ext.RegisterConsoleCommand("atlas_iconk", cmdIconK)
Ext.RegisterConsoleCommand("atlas_layerdump", cmdLayerDump)
Ext.RegisterConsoleCommand("atlas_layerinfo", cmdLayerInfo)
Ext.RegisterConsoleCommand("atlas_calib", cmdCalib)
Ext.RegisterConsoleCommand("atlas_layer_stop", Layer.Stop)
Ext.RegisterConsoleCommand("atlas_layer_start", Layer.Start)

P.Log("layer ready, start with !atlas_layer_start in client console")
