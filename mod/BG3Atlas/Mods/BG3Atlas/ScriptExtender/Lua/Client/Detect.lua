local P = BG3Atlas.Probe
local Found = BG3Atlas.Found
local Points = BG3Atlas.Points

local Detect = {}
BG3Atlas.Detect = Detect

Detect.BatchSize = 150
Detect.PeriodMs = 250
Detect.NearRadius = 40
Detect.StatsMs = 60000

local itemCategories = {
    weapon_unique = true,
    armor_unique = true,
    accessory = true,
    scroll = true,
    book = true,
    key = true,
    ingredient = true,
    valuable = true,
}

local containerCategories = {
    chest = true,
    container = true,
    remains = true,
}

local queue = nil
local queueMap = nil
local cursor = 1
local seenInWorld = {}
local seenFull = {}
local running = false
local stats = {}
local lastStats = nil
local lastError = nil

local function resetStats()
    stats = { checked = 0, itemsSeen = 0, full = 0, empty = 0, unreadable = 0, missing = 0, marked = 0 }
end

resetStats()

function Detect.BuildQueue(byCategory, map)
    local out = {}
    for cat, list in pairs(byCategory) do
        if itemCategories[cat] or containerCategories[cat] or cat == "boss" then
            for _, pt in ipairs(list) do
                if pt.map == map then
                    out[#out + 1] = { id = pt.id, cat = cat, map = pt.map, x = pt.x, y = pt.y, name = pt.name }
                end
            end
        end
    end
    return out
end

function Detect.Near(list, x, y, radius)
    local out = {}
    local r2 = radius * radius
    for _, e in ipairs(list) do
        local dx, dy = e.x - x, e.y - y
        if dx * dx + dy * dy <= r2 then
            out[#out + 1] = e
        end
    end
    return out
end

local function containerCount(entity)
    local owner = P.Get(entity, "InventoryOwner")
    local inv = owner and P.Get(owner, "PrimaryInventory")
    local container = inv and P.Get(inv, "InventoryContainer")
    local items = container and P.Get(container, "Items")
    if not items then
        return nil
    end
    local n = 0
    for _ in pairs(items) do
        n = n + 1
    end
    return n
end

local function mark(entry, reason)
    Found.SetFound(entry.id, true)
    stats.marked = stats.marked + 1
    P.Log("auto found " .. entry.cat .. " " .. P.Str(entry.name) .. " (" .. reason .. ")")
end

local function check(entry, near)
    if Found.IsFound(entry.id) or Found.IsBlocked(entry.id) then
        return
    end
    stats.checked = stats.checked + 1
    local ok, entity = pcall(Ext.Entity.Get, entry.id)
    if not ok then
        entity = nil
    end
    if not entity then
        stats.missing = stats.missing + 1
    end
    if itemCategories[entry.cat] then
        if entity then
            if P.Get(entity, "InventoryMember") then
                mark(entry, "in inventory")
            else
                seenInWorld[entry.id] = true
                stats.itemsSeen = stats.itemsSeen + 1
            end
        elseif near and seenInWorld[entry.id] then
            mark(entry, "gone from world")
        end
    elseif containerCategories[entry.cat] then
        if not entity then
            return
        end
        local n = containerCount(entity)
        if n == nil then
            stats.unreadable = stats.unreadable + 1
        elseif n > 0 then
            stats.full = stats.full + 1
            seenFull[entry.id] = true
        else
            stats.empty = stats.empty + 1
            if seenFull[entry.id] then
                mark(entry, "emptied")
            end
        end
    elseif entry.cat == "boss" then
        local health = entity and P.Get(entity, "Health")
        local hp = health and P.Get(health, "Hp")
        if type(hp) == "number" and hp <= 0 then
            mark(entry, "dead")
        end
    end
end

local function logStats()
    local now = Ext.Timer.MonotonicTime()
    if not lastStats then
        lastStats = now
        return
    end
    if now - lastStats < Detect.StatsMs then
        return
    end
    lastStats = now
    P.Log(string.format("detect %s: queue %d, checked %d, items seen %d, containers full %d empty %d unreadable %d, missing %d, marked %d", P.Str(queueMap), queue and #queue or 0, stats.checked, stats.itemsSeen, stats.full, stats.empty, stats.unreadable, stats.missing, stats.marked))
    resetStats()
end

local function step()
    if not running then
        return
    end
    local ok, err = pcall(function()
        if not BG3Atlas.World.Ready() then
            return
        end
        local map = BG3Atlas.Layer and BG3Atlas.Layer.PlayerMap()
        if not map or not Points.HasMap(map) then
            return
        end
        if map ~= queueMap or not queue then
            queue = Detect.BuildQueue(Points.ByCategory(), map)
            queueMap = map
            cursor = 1
            seenInWorld = {}
            seenFull = {}
        end
        local pos = BG3Atlas.Layer.PlayerPos()
        if pos then
            local lx, ly = Points.ToLocal(map, pos[1], pos[3])
            if lx then
                for _, entry in ipairs(Detect.Near(queue, lx, ly, Detect.NearRadius)) do
                    check(entry, true)
                end
            end
        end
        local last = math.min(#queue, cursor + Detect.BatchSize - 1)
        for i = cursor, last do
            check(queue[i], false)
        end
        cursor = last + 1
        if cursor > #queue then
            cursor = 1
        end
        logStats()
    end)
    if not ok then
        local msg = P.Str(err)
        if msg ~= lastError then
            lastError = msg
            P.Log("detect failed: " .. msg)
        end
    end
    Ext.Timer.WaitForRealtime(Detect.PeriodMs, step)
end

function Detect.Start()
    if running then
        return
    end
    running = true
    step()
end

Ext.Events.SessionLoaded:Subscribe(function()
    seenInWorld = {}
    seenFull = {}
    queue = nil
    queueMap = nil
    Detect.Start()
end)
