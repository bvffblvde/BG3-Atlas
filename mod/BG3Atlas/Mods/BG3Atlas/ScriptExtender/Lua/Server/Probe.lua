local P = BG3Atlas.Probe

local marked = {}

local function hostEntity()
    local host = Osi.GetHostCharacter()
    return host, Ext.Entity.Get(host)
end

local function itemName(uuid)
    local ok, name = pcall(function()
        return Osi.ResolveTranslatedString(Osi.GetDisplayName(uuid))
    end)
    if ok and name and name ~= "" then
        return name
    end
    return "?"
end

local function cmdPos()
    local host, ent = hostEntity()
    local pos = P.Pos(ent)
    local _, region = pcall(Osi.GetRegion, host)
    P.Log("host " .. P.Str(host) .. " region " .. P.Str(region) .. " pos " .. P.FormatPos(pos))
end

local function nearbyItems(radius)
    local _, ent = hostEntity()
    local pos = P.Pos(ent)
    local result = {}
    for _, e in ipairs(Ext.Entity.GetEntitiesAroundPosition(pos, radius, false, true)) do
        if P.Get(e, "ServerItem") and not P.Get(e, "InventoryMember") then
            local ep = P.Pos(e)
            if ep then
                local dx, dz = ep[1] - pos[1], ep[3] - pos[3]
                result[#result + 1] = { entity = e, dist = math.sqrt(dx * dx + dz * dz), pos = ep }
            end
        end
    end
    table.sort(result, function(a, b)
        return a.dist < b.dist
    end)
    return result
end

local function cmdMark(_, style, radius, count)
    style = style or "WithersWardrobe"
    radius = tonumber(radius) or 6
    count = tonumber(count) or 3
    local items = nearbyItems(radius)
    local sent = {}
    for i = 1, math.min(count, #items) do
        local e = items[i].entity
        local uuid = P.Uuid(e)
        local existing = P.Get(e, "MapMarkerStyle")
        local comp = existing or e:CreateComponent("MapMarkerStyle")
        if comp then
            comp.Style = style
            e:Replicate("MapMarkerStyle")
            marked[#marked + 1] = e
            sent[#sent + 1] = uuid
            P.Log(string.format("marked %s '%s' dist %.1f pos %s existing=%s", P.Str(uuid), itemName(uuid), items[i].dist, P.FormatPos(items[i].pos), P.Str(existing ~= nil)))
        else
            P.Log("CreateComponent failed for " .. P.Str(uuid))
        end
    end
    if #sent == 0 then
        P.Log("no free items within " .. radius .. "m")
        return
    end
    Ext.ServerNet.BroadcastMessage(P.Channel, Ext.Json.Stringify({ style = style, uuids = sent }))
end

local function cmdUnmark()
    for _, e in ipairs(marked) do
        pcall(function()
            e:RemoveComponent("MapMarkerStyle")
        end)
    end
    P.Log("removed MapMarkerStyle from " .. #marked .. " items")
    marked = {}
    Ext.ServerNet.BroadcastMessage(P.Channel, Ext.Json.Stringify({ clear = true }))
end

local function cmdStyles()
    local lines = {}
    for _, e in ipairs(Ext.Entity.GetAllEntitiesWithComponent("MapMarkerStyle")) do
        local uuid = P.Uuid(e)
        lines[#lines + 1] = P.Str(uuid) .. " " .. P.Str(e.MapMarkerStyle.Style) .. " " .. itemName(uuid) .. " " .. P.FormatPos(P.Pos(e))
    end
    P.Log("server entities with MapMarkerStyle: " .. #lines)
    P.Save("server_styles.txt", lines)
end

Ext.RegisterConsoleCommand("atlas_pos", cmdPos)
Ext.RegisterConsoleCommand("atlas_mark", cmdMark)
Ext.RegisterConsoleCommand("atlas_unmark", cmdUnmark)
Ext.RegisterConsoleCommand("atlas_styles", cmdStyles)
