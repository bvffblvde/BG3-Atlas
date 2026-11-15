local P = BG3Atlas.Probe

local lastMarks = { style = "WithersWardrobe", uuids = {} }

local function sortedKeys(t)
    local keys = {}
    for k in pairs(t) do
        keys[#keys + 1] = k
    end
    table.sort(keys, function(a, b)
        return P.Str(a) < P.Str(b)
    end)
    return keys
end

local function dumpProps(obj, title, lines)
    lines[#lines + 1] = ""
    lines[#lines + 1] = "## " .. title .. " [" .. P.Str(P.Get(obj, "Type")) .. "]"
    if not obj then
        lines[#lines + 1] = "  nil"
        return
    end
    local ok, props = pcall(function()
        return obj:GetAllProperties()
    end)
    if not ok or type(props) ~= "table" then
        lines[#lines + 1] = "  GetAllProperties failed: " .. P.Str(props)
        return
    end
    for _, k in ipairs(sortedKeys(props)) do
        lines[#lines + 1] = "  " .. P.Str(k) .. " = " .. P.Str(props[k])
    end
end

local function walk(node, depth, ctx)
    if not node or depth > 80 then
        return
    end
    ctx.visited = ctx.visited + 1
    local typ = P.Str(P.Get(node, "Type"))
    local name = P.Get(node, "Name")
    if name and name ~= "" then
        ctx.tree[#ctx.tree + 1] = string.rep(" ", depth) .. typ .. " #" .. P.Str(name)
    end
    if typ:find("LSWorldMapMarker", 1, true) then
        ctx.markers[#ctx.markers + 1] = node
    elseif typ:find("LSWorldMap", 1, true) then
        ctx.maps[#ctx.maps + 1] = node
    end
    local count = P.Get(node, "VisualChildrenCount") or 0
    for i = 1, count do
        local ok, child = pcall(function()
            return node:VisualChild(i)
        end)
        if ok and child then
            walk(child, depth + 1, ctx)
        end
    end
end

local function cmdUi()
    Ext.UI.Defer(function()
        local root = Ext.UI.GetRoot()
        local ctx = { visited = 0, tree = {}, maps = {}, markers = {} }
        walk(root, 0, ctx)
        local lines = { "# BG3Atlas UI probe", "visited " .. ctx.visited .. ", maps " .. #ctx.maps .. ", markers " .. #ctx.markers }
        for i, map in ipairs(ctx.maps) do
            dumpProps(map, "map " .. i, lines)
            dumpProps(P.Get(map, "WorldMapData"), "map " .. i .. " WorldMapData", lines)
            dumpProps(P.Get(map, "DataContext"), "map " .. i .. " DataContext", lines)
        end
        local seen = {}
        local dumped = 0
        for i, m in ipairs(ctx.markers) do
            local dc = P.Get(m, "DataContext")
            local key = P.Str(P.Get(dc, "Type"))
            if not seen[key] and dumped < 12 then
                seen[key] = true
                dumped = dumped + 1
                dumpProps(m, "marker " .. i, lines)
                dumpProps(dc, "marker " .. i .. " DataContext", lines)
            end
        end
        lines[#lines + 1] = ""
        lines[#lines + 1] = "# named tree"
        for _, l in ipairs(ctx.tree) do
            lines[#lines + 1] = l
        end
        P.Save("probe_ui.txt", lines)
        P.Log("ui probe: maps " .. #ctx.maps .. ", markers " .. #ctx.markers)
    end)
end

local function checkMarks()
    for _, uuid in ipairs(lastMarks.uuids) do
        local e = Ext.Entity.Get(uuid)
        local comp = e and P.Get(e, "MapMarkerStyle")
        P.Log("client " .. P.Str(uuid) .. " entity=" .. P.Str(e ~= nil) .. " MapMarkerStyle=" .. P.Str(comp and comp.Style))
    end
end

local function cmdClientMark(_, style)
    style = style or lastMarks.style
    for _, uuid in ipairs(lastMarks.uuids) do
        local e = Ext.Entity.Get(uuid)
        if e then
            local comp = P.Get(e, "MapMarkerStyle") or e:CreateComponent("MapMarkerStyle")
            if comp then
                comp.Style = style
                P.Log("client marked " .. P.Str(uuid) .. " " .. style)
            end
        end
    end
end

local function cmdClientStyles()
    local lines = {}
    for _, e in ipairs(Ext.Entity.GetAllEntitiesWithComponent("MapMarkerStyle")) do
        lines[#lines + 1] = P.Str(P.Uuid(e)) .. " " .. P.Str(e.MapMarkerStyle.Style) .. " " .. P.FormatPos(P.Pos(e))
    end
    P.Log("client entities with MapMarkerStyle: " .. #lines)
    P.Save("client_styles.txt", lines)
end

Ext.RegisterNetListener(P.Channel, function(_, payload)
    local data = Ext.Json.Parse(payload)
    if data.clear then
        lastMarks.uuids = {}
        return
    end
    lastMarks = data
    Ext.Timer.WaitFor(500, checkMarks)
end)

Ext.RegisterConsoleCommand("atlas_ui", cmdUi)
Ext.RegisterConsoleCommand("atlas_ccheck", checkMarks)
Ext.RegisterConsoleCommand("atlas_cmark", cmdClientMark)
Ext.RegisterConsoleCommand("atlas_cstyles", cmdClientStyles)
