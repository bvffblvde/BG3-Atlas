local P = BG3Atlas.Probe
local Settings = BG3Atlas.Settings
local Points = BG3Atlas.Points

local Layer = {}
BG3Atlas.Layer = Layer

Layer.IconPixels = { JournalMap = 40, JournalMap_c = 40, Minimap = 32 }
Layer.IconUnits = 24
Layer.PeriodMs = 250
Layer.Widgets = { JournalMap = true, JournalMap_c = true, Minimap = true }
Layer.PanelWidgets = { BG3A_PanelWidget = true, BG3A_PanelWidget_c = true }
Layer.LegendWidgets = { JournalMap = true, JournalMap_c = true }
Layer.LabelSize = 26
Layer.SettleMs = 500

local settle = {}

local labelPid = 1

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
        PointId = { Type = "String" },
        Label = { Type = "String" },
        LabelSize = { Type = "Single" },
    })
    local props = { Search = { Type = "Collection" }, LayerZ = { Type = "Int32" }, GridOpacity = { Type = "Single" }, ShroudOpacity = { Type = "Single" } }
    for _, cat in ipairs(Points.Categories) do
        props["Cat_" .. cat] = { Type = "Collection" }
        props["Found_" .. cat] = { Type = "Collection" }
    end
    Ext.UI.RegisterType("BG3A_Layer", props)
    registered = true
end

local flagKeys = { [1] = "flagLocked", [2] = "flagTrapped", [4] = "flagHidden" }

local function pointLabel(pt, found)
    local lang = Settings.Language()
    local text = BG3Atlas.Locale.Text(lang)
    local name = lang == "ru" and pt.nameRu or pt.name
    local extra = {}
    for _, bit in ipairs({ 1, 2, 4 }) do
        if pt.flags and (pt.flags & bit) ~= 0 then
            extra[#extra + 1] = text[flagKeys[bit]]
        end
    end
    if found then
        extra[#extra + 1] = text.flagFound
    end
    local label = name
    if #extra > 0 then
        label = label .. " (" .. table.concat(extra, ", ") .. ")"
    end
    return label
end

local function newPoint(pt, found)
    local p = Ext.UI.Instantiate("BG3A_Point")
    P.Set(p, "PosX", pt.x)
    P.Set(p, "PosY", pt.y)
    P.Set(p, "PointId", pt.id)
    P.Set(p, "Label", pointLabel(pt, found))
    P.Set(p, "LabelSize", Layer.LabelSize * Settings.PanelScale(Settings.PanelSize(labelPid)))
    return p
end

local placed = {}
local syncedVersion = -1
local searchVersion = -1
local viewKey = "none"
local currentMap = nil
local rebuild = false
local rebuildGen = 0
local seenGen = -1
local viewList = {}
local loopGen = 0

local viewCounts = nil

local function countForKey(key)
    if not viewCounts then
        viewCounts = {}
        for _, list in pairs(Points.ByCategory()) do
            for _, pt in ipairs(list) do
                for _, k in ipairs(BG3Atlas.Submaps.Keys(pt.map, pt.submap, pt.floor)) do
                    viewCounts[k] = (viewCounts[k] or 0) + 1
                end
            end
        end
    end
    return viewCounts[key] or 0
end

local revealed = nil
local revealedSig = nil
local lastRegionScan = -100000

local subregion = nil

local function insideSubregion(pt)
    if not subregion then
        return true
    end
    local dx, dy = pt.x - subregion.x, pt.y - subregion.y
    return dx * dx + dy * dy <= subregion.r2
end

local function inView(pt)
    local keys = pt._keys
    if not keys then
        keys = {}
        for _, k in ipairs(BG3Atlas.Submaps.Keys(pt.map, pt.submap, pt.floor)) do
            keys[k] = true
        end
        pt._keys = keys
    end
    return keys[viewKey] == true and insideSubregion(pt)
end

function Layer.ForceRebuild()
    rebuildGen = rebuildGen + 1
end

local player = nil

local function readPlayer()
    if not BG3Atlas.World.Ready() then
        player = nil
        return false
    end
    for _, e in ipairs(Ext.Entity.GetAllEntitiesWithComponent("ClientControl")) do
        if P.Get(e, "ClientCharacter") then
            local pos = P.Pos(e)
            local level = P.Get(e, "Level")
            local map = level and P.Get(level, "LevelName")
            if pos and map then
                player = { pos = { pos[1], pos[2], pos[3] }, map = P.Str(map) }
                BG3Atlas.Found.Prime()
                return true
            end
        end
    end
    player = nil
    return false
end

function Layer.PlayerMap()
    return player and player.map
end

function Layer.PlayerPos()
    return player and player.pos
end

function Layer.CurrentMap()
    return currentMap
end

local function gameBuilding(found)
    for _, entry in ipairs(found) do
        local data = entry.image and P.Get(entry.image, "DataContext")
        if data then
            local building = P.Get(data, "CurrentBuilding")
            local uuid = building and P.Get(building, "UuidStr")
            local floor = P.Get(data, "Floor")
            if type(uuid) == "string" then
                return true, uuid ~= "" and uuid or nil, tonumber(floor) or 0
            end
        end
    end
    return false, nil, nil
end

local function updateView(found)
    local snap = player
    local pos = snap and snap.pos
    local map = snap and snap.map
    if not pos or not map then
        return
    end
    if map ~= currentMap then
        currentMap = map
        if BG3Atlas.Panel then
            BG3Atlas.Panel.MarkDirty()
        end
    end
    local fromGame, building, floor = gameBuilding(found)
    if not fromGame then
        building, floor = BG3Atlas.Submaps.Assign(map, pos[1], pos[2], pos[3])
    end
    local key = BG3Atlas.Submaps.Key(map, building, floor)
    if building ~= nil and countForKey(key) == 0 and (not fromGame or BG3Atlas.Submaps.Known(map, building)) then
        key = BG3Atlas.Submaps.Key(map, nil, nil)
    end
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
    viewList = {}
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
            viewList[#viewList + 1] = { pt = pt, cat = cat }
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
        if item and P.Get(item, "PointId") == id then
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
    for _, v in ipairs(viewList) do
        local pt, cat = v.pt, v.cat
        local isFound = BG3Atlas.Found.IsFound(pt.id)
        if placed[pt.id] ~= isFound then
            local from = vm[(isFound and "Cat_" or "Found_") .. cat]
            local to = vm[(isFound and "Found_" or "Cat_") .. cat]
            if not removeById(from, pt.id) then
                logOnce("remove", "found sync could not remove point " .. P.Str(pt.id))
            end
            to[#to + 1] = newPoint(pt, isFound)
            placed[pt.id] = isFound
            moved = moved + 1
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
    local panels = {}
    local ok, content = pcall(function()
        return Ext.UI.GetRoot():Find("ContentRoot")
    end)
    if not ok or not content then
        return out, panels
    end
    local function collect(node, depth)
        for _, child in ipairs(children(node)) do
            local wname = P.Get(child, "Name")
            local isWidget = P.Str(P.Get(child, "Type")) == "ls.UIWidget"
            if isWidget and wname and Layer.PanelWidgets[wname] then
                local pid = tonumber(P.Get(child, "PlayerId")) or 1
                panels[#panels + 1] = { node = child, player = pid, name = wname }
                logOnce("panelpid" .. wname .. pid, "panel widget " .. wname .. " player " .. pid)
            elseif isWidget and wname and Layer.Widgets[wname] then
                local entry = { widget = wname, node = child, player = tonumber(P.Get(child, "PlayerId")) or 1 }
                findMap(child, 0, entry)
                if entry.map then
                    out[#out + 1] = entry
                end
            elseif not isWidget and depth < 4 then
                collect(child, depth + 1)
            end
        end
    end
    collect(content, 0)
    return out, panels
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

local function findLegend(node, depth)
    if not node or depth > 14 then
        return nil
    end
    if P.Get(node, "Name") == "Legend" then
        return node
    end
    if P.Str(P.Get(node, "Type")) == "ls.LSWorldMap" then
        return nil
    end
    for _, c in ipairs(children(node)) do
        local found = findLegend(c, depth + 1)
        if found then
            return found
        end
    end
    return nil
end

local function updateLegend(entry, model, pid)
    if not Layer.LegendWidgets[entry.widget] then
        return
    end
    local hide = Settings.HideLegend(pid)
    if not hide and not model.legendHidden then
        return
    end
    local legend = findLegend(entry.node, 0)
    if not legend then
        logOnce("nolegend" .. entry.widget, "legend not found in " .. entry.widget)
        return
    end
    local alpha = hide and 0.0 or 1.0
    if P.Get(legend, "Opacity") ~= alpha then
        P.Set(legend, "Opacity", alpha)
    end
    model.legendHidden = hide
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

local cursorLogged = false
local mouseLogged = false
local lastCursorText = nil
local hovered = {}
local mouseSeen = -100000
local padSeen = -100000
local padSeenBy = {}
local fogToggleQueued = {}
local gridToggleQueued = {}
Layer.GridOpacity = 0.2

Layer.HoverMs = 1000

local pendingToggles = {}

function Layer.RequestToggle(player)
    pendingToggles[#pendingToggles + 1] = player or 1
end

function Layer.PadHoverPlayers()
    local out = {}
    local now = Ext.Timer.MonotonicTime()
    for pid, h in pairs(hovered) do
        if h.pad and now - h.t <= Layer.HoverMs then
            out[#out + 1] = pid
        end
    end
    table.sort(out)
    return out
end

function Layer.PadOpenPlayer()
    local now = Ext.Timer.MonotonicTime()
    local best, bestT = 1, -100000
    for pid, t in pairs(padSeenBy) do
        if now - t <= Layer.HoverMs and t > bestT then
            best, bestT = pid, t
        end
    end
    return best
end

function Layer.PadMapVisible(player)
    local seen = padSeen
    if player then
        seen = padSeenBy[player] or -100000
    end
    return Ext.Timer.MonotonicTime() - seen <= Layer.HoverMs
end

function Layer.RequestFogToggle(player)
    fogToggleQueued[#fogToggleQueued + 1] = player or 1
end

function Layer.RequestGridToggle(player)
    gridToggleQueued[#gridToggleQueued + 1] = player or 1
end

function Layer.MouseMapVisible()
    return Ext.Timer.MonotonicTime() - mouseSeen <= Layer.HoverMs
end

function Layer.ToggleHovered(player)
    local h = hovered[player or 1]
    if not h or Ext.Timer.MonotonicTime() - h.t > Layer.HoverMs then
        return false
    end
    local on = BG3Atlas.Found.Toggle(h.pt.id)
    P.Log("manual found " .. P.Str(h.pt.id) .. " " .. (on and "on" or "off"))
    if BG3Atlas.Panel then
        BG3Atlas.Panel.MarkDirty()
    end
    return true
end

local function vecParts(v)
    if v == nil then
        return nil
    end
    local a = P.Get(v, 1) or P.Get(v, "x") or P.Get(v, "X")
    local b = P.Get(v, 2) or P.Get(v, "y") or P.Get(v, "Y")
    local c = P.Get(v, 3) or P.Get(v, "z") or P.Get(v, "Z")
    return a, b, c
end

local function updateCursor(entry)
    local pad = entry.widget == "JournalMap_c"
    if (not pad and entry.widget ~= "JournalMap") or not currentMap or not BG3Atlas.Panel then
        return
    end
    if P.Get(entry.map, "IsVisible") == false then
        return
    end
    local tx, ty = vecParts(P.Get(entry.map, "MapPos"))
    local holderW = P.Get(entry.map, "ActualWidth")
    local holderH = P.Get(entry.map, "ActualHeight")
    local mapScale = P.Get(entry.map, "MapScale")
    local imageW = entry.image and P.Get(entry.image, "ActualWidth")
    local imageH = entry.image and P.Get(entry.image, "ActualHeight")
    local worldW = worldWidth(entry)
    if type(tx) ~= "number" or not holderW or not holderH or not mapScale or mapScale <= 0 or not imageW or imageW <= 0 or not imageH or not worldW then
        logOnce("nocursor", "cursor position not readable on " .. entry.widget)
        return
    end
    if pad then
        padSeen = Ext.Timer.MonotonicTime()
        padSeenBy[entry.player or 1] = padSeen
    end
    local unit = worldW / imageW
    local lx = (holderW / 2 - tx - (holderW - imageW) / 2) * unit
    local ly = (holderH / 2 - ty - (holderH - imageH) / 2) * unit
    if not pad then
        mouseSeen = Ext.Timer.MonotonicTime()
        local a, b, c = vecParts(P.Get(entry.map, "MouseWorldCoordinates"))
        if type(a) ~= "number" then
            logOnce("nomouse", "mouse position not readable on " .. entry.widget)
            return
        end
        lx, ly = Points.ToLocal(currentMap, a, type(c) == "number" and c or b)
        if not lx then
            return
        end
        if not mouseLogged then
            mouseLogged = true
            P.Log(string.format("mouse coords %s %s %s local %.1f %.1f", P.Str(a), P.Str(b), P.Str(c), lx, ly))
        end
    elseif not cursorLogged then
        cursorLogged = true
        P.Log(string.format("cursor local %.1f %.1f player %s", lx, ly, P.FormatPos(player and player.pos)))
    end
    local radius = 30 * worldW / (mapScale * imageW)
    local best, bestD = nil, radius * radius
    local hideFound = Settings.HideFound()
    for _, v in ipairs(viewList) do
        local pt = v.pt
        local dx, dy = pt.x - lx, pt.y - ly
        local d = dx * dx + dy * dy
        if d < bestD and Settings.IsEnabled(v.cat) and not (hideFound and BG3Atlas.Found.IsFound(pt.id)) then
            best, bestD = pt, d
        end
    end
    hovered[entry.player or 1] = best and { pt = best, t = Ext.Timer.MonotonicTime(), pad = pad } or nil
    if not pad then
        return
    end
    local text = best and pointLabel(best, BG3Atlas.Found.IsFound(best.id)) or ""
    if text ~= lastCursorText and BG3Atlas.Panel.SetCursorInfo(entry.player, text) then
        lastCursorText = text
    end
end

local function scanRegions(found)
    for _, entry in ipairs(found) do
        local data = entry.image and P.Get(entry.image, "DataContext")
        local container = data and P.Get(data, "RegionsContainer")
        local regions = container and P.Get(container, "Regions")
        if regions then
            local list, sig = {}, {}
            for i = 1, #regions do
                local r = regions[i]
                if r and not P.Get(r, "Hidden") then
                    local x, y = vecParts(P.Get(r, "WorldPos"))
                    local w, h = vecParts(P.Get(r, "WorldSize"))
                    if type(x) == "number" and type(w) == "number" then
                        list[#list + 1] = { x, y, x + w, y + h }
                        sig[#sig + 1] = i
                    end
                end
            end
            return list, table.concat(sig, ",")
        end
    end
    return nil, nil
end

local function updateSubregion(found)
    if not currentMap then
        return
    end
    for _, entry in ipairs(found) do
        local data = entry.image and P.Get(entry.image, "DataContext")
        if data then
            local available = P.Get(data, "SubregionAvailable")
            local cx, cz = vecParts(P.Get(data, "SubregionCenter"))
            local radius = P.Get(data, "SubregionRadius")
            local next = nil
            if available and type(cx) == "number" and type(cz) == "number" and type(radius) == "number" and radius > 0 then
                local lx, ly = Points.ToLocal(currentMap, cx, cz)
                if lx then
                    local r = radius + 2
                    next = { x = lx, y = ly, r2 = r * r }
                end
            end
            local changed = (next == nil) ~= (subregion == nil)
            if next and subregion then
                changed = math.abs(next.x - subregion.x) > 1 or math.abs(next.y - subregion.y) > 1 or math.abs(next.r2 - subregion.r2) > 4
            end
            if changed then
                subregion = next
                rebuild = true
                P.Log("subregion " .. (next and string.format("%.1f %.1f r=%.1f", cx, cz, radius) or "none"))
            end
            return
        end
    end
end

local function updateRegions(found)
    local now = Ext.Timer.MonotonicTime()
    if now - lastRegionScan < 2000 then
        return
    end
    lastRegionScan = now
    local list, sig = scanRegions(found)
    if list and sig ~= revealedSig then
        revealed = list
        revealedSig = sig
        logOnce("regions" .. #list, "explored regions: " .. #list)
    end
end

local playerStates = {}

local function loadState(pid)
    local st = playerStates[pid] or {}
    placed = st.placed or {}
    syncedVersion = st.syncedVersion or -1
    searchVersion = st.searchVersion or -1
    viewKey = st.viewKey or "none"
    rebuild = st.rebuild or false
    seenGen = st.seenGen or -1
    viewList = st.viewList or {}
    subregion = st.subregion
    revealed = st.revealed
    revealedSig = st.revealedSig
    lastRegionScan = st.lastRegionScan or -100000
    lastCursorText = st.lastCursorText
    models = st.models or {}
end

local function saveState(pid)
    playerStates[pid] = {
        placed = placed,
        syncedVersion = syncedVersion,
        searchVersion = searchVersion,
        viewKey = viewKey,
        rebuild = rebuild,
        seenGen = seenGen,
        viewList = viewList,
        subregion = subregion,
        revealed = revealed,
        revealedSig = revealedSig,
        lastRegionScan = lastRegionScan,
        lastCursorText = lastCursorText,
        models = models,
    }
end

local updatePlayer

local function update()
    register()
    local groups = {}
    local order = {}
    local maps, panels = findMaps()
    local names = {}
    for _, m in ipairs(maps) do
        names[#names + 1] = m.widget .. "@" .. tostring(m.player)
    end
    for _, p in ipairs(panels) do
        names[#names + 1] = p.name .. "@" .. tostring(p.player)
    end
    if not BG3Atlas.Guard.Settled(settle, names, Ext.Timer.MonotonicTime(), Layer.SettleMs) then
        if settle.logged ~= settle.since then
            settle.logged = settle.since
            P.Log("ui widget closed, waiting: " .. table.concat(names, ","))
        end
        return
    end
    if #panels > 1 then
        logOnce("panels" .. #panels, "panel widgets found: " .. #panels)
    end
    if BG3Atlas.Panel then
        BG3Atlas.Panel.Reset()
        for _, p in ipairs(panels) do
            local ok, err = pcall(BG3Atlas.Panel.Update, p.node, p.player)
            if not ok then
                logOnce("panelerr" .. P.Str(err), "panel update failed: " .. P.Str(err))
            end
        end
    end
    for _, entry in ipairs(maps) do
        local pid = entry.player or 1
        if not groups[pid] then
            groups[pid] = {}
            order[#order + 1] = pid
        end
        groups[pid][#groups[pid] + 1] = entry
    end
    table.sort(order)
    if #order > 1 then
        logOnce("split" .. #order, "map widgets for " .. #order .. " players")
    end
    local failure = nil
    for _, pid in ipairs(order) do
        loadState(pid)
        local ok, err = pcall(updatePlayer, groups[pid])
        saveState(pid)
        if not ok and not failure then
            failure = err
        end
    end
    if failure then
        error(failure, 0)
    end
end

function updatePlayer(found)
    labelPid = (found[1] and found[1].player) or 1
    updateView(found)
    updateSubregion(found)
    updateRegions(found)
    local shared = nil
    local forced = rebuild or seenGen ~= rebuildGen
    rebuild = false
    seenGen = rebuildGen
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
                if entry.widget == "Minimap" or entry.widget == "Minimap_c" then
                    P.Set(entry.layer, "IsHitTestVisible", false)
                end
                model.scale = nil
                lastCursorText = nil
                P.Log("layer attached to " .. entry.widget)
            end
            local pid = entry.player or 1
            P.Set(shared, "LayerZ", Settings.FogOnly(pid) and 0 or 1)
            local grid, fog = Settings.StyleOpacity(Settings.MapStyle(pid), Layer.GridOpacity)
            P.Set(shared, "GridOpacity", tonumber(grid))
            P.Set(shared, "ShroudOpacity", tonumber(fog))
            updateScale(entry, model)
            updateFilters(entry)
            updateLegend(entry, model, pid)
            updateCursor(entry)
        else
            logOnce("nolayer", "LSWorldMap found without BG3A_Layer: theme override not applied")
        end
    end
end

local function loop(gen)
    if not running or gen ~= loopGen then
        return
    end
    if #gridToggleQueued > 0 or #fogToggleQueued > 0 then
        local grids, fogs = gridToggleQueued, fogToggleQueued
        gridToggleQueued, fogToggleQueued = {}, {}
        for _, pid in ipairs(grids) do
            Settings.NextMapStyle(pid)
        end
        for _, pid in ipairs(fogs) do
            Settings.SetFogOnly(not Settings.FogOnly(pid), pid)
        end
        Settings.Save()
        if BG3Atlas.Panel then
            BG3Atlas.Panel.MarkDirty()
        end
    end
    local queued = pendingToggles
    pendingToggles = {}
    for _, pid in ipairs(queued) do
        pcall(Layer.ToggleHovered, pid)
    end
    local okRead, ready = pcall(readPlayer)
    if not okRead then
        player = nil
        logOnce("readplayer", "player read failed: " .. P.Str(ready))
    end
    if not okRead or not ready then
        Ext.Timer.WaitForRealtime(Layer.PeriodMs, function()
            loop(gen)
        end)
        return
    end
    Ext.UI.Defer(function()
        local ok, err = pcall(update)
        if not ok then
            local msg = P.Str(err)
            logOnce(msg, "layer update failed: " .. msg)
        end
    end)
    Ext.Timer.WaitForRealtime(Layer.PeriodMs, function()
        loop(gen)
    end)
end

function Layer.Start()
    if running then
        return
    end
    running = true
    loopGen = loopGen + 1
    P.Log("layer started")
    loop(loopGen)
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

local dumpCount = 0

local function dumpProps(lines, title, obj)
    lines[#lines + 1] = "### " .. title .. " " .. P.Str(obj and P.Get(obj, "Type"))
    if not obj then
        return
    end
    local ok, props = pcall(function()
        return obj:GetAllProperties()
    end)
    if not ok or type(props) ~= "table" then
        lines[#lines + 1] = "  " .. P.Str(props)
        return
    end
    local keys = {}
    for k in pairs(props) do
        keys[#keys + 1] = P.Str(k)
    end
    table.sort(keys)
    for _, k in ipairs(keys) do
        local v = props[k]
        local text = P.Str(v)
        if type(v) == "table" or type(v) == "userdata" then
            local a = P.Get(v, 1) or P.Get(v, "x") or P.Get(v, "X")
            local b = P.Get(v, 2) or P.Get(v, "y") or P.Get(v, "Y")
            local c = P.Get(v, 3) or P.Get(v, "z") or P.Get(v, "Z")
            if type(a) == "number" then
                text = P.Str(a) .. ", " .. P.Str(b) .. (c ~= nil and (", " .. P.Str(c)) or "")
            end
        end
        lines[#lines + 1] = "  " .. k .. " = " .. text
    end
end

local function cmdLayerDump()
    Ext.UI.Defer(function()
        local lines = { "view " .. viewKey, "player " .. P.FormatPos(player and player.pos) }
        for _, entry in ipairs(findMaps()) do
            lines[#lines + 1] = "## " .. entry.widget .. " MapScale=" .. P.Str(P.Get(entry.map, "MapScale")) .. " MinWidth=" .. P.Str(P.Get(entry.map, "MinWidth")) .. " worldW=" .. P.Str(worldWidth(entry))
            local data = entry.image and P.Get(entry.image, "DataContext")
            dumpProps(lines, "WorldMapData", data)
            dumpProps(lines, "CurrentBuilding", data and P.Get(data, "CurrentBuilding"))
            local container = data and P.Get(data, "RegionsContainer")
            dumpProps(lines, "RegionsContainer", container)
            local regions = container and P.Get(container, "Regions")
            local count = regions and #regions or 0
            lines[#lines + 1] = "  regions " .. count
            for i = 1, math.min(count, 12) do
                dumpProps(lines, "Region " .. i, regions[i])
            end
            if entry.layer then
                for _, c in ipairs(children(entry.layer)) do
                    lines[#lines + 1] = "  " .. P.Str(P.Get(c, "Name")) .. " Visibility=" .. P.Str(P.Get(c, "Visibility")) .. " Opacity=" .. P.Str(P.Get(c, "Opacity"))
                end
            end
        end
        dumpCount = dumpCount + 1
        P.Save("layer_dump_" .. dumpCount .. ".txt", lines)
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
