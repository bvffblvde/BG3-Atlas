local P = BG3Atlas.Probe
local Found = BG3Atlas.Found
local Points = BG3Atlas.Points

local Detect = {}
BG3Atlas.Detect = Detect

Detect.BatchSize = 150
Detect.PeriodMs = 250

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

local queue = nil
local cursor = 1
local seenInWorld = {}
local seenFull = {}
local running = false

local function buildQueue()
    queue = {}
    for cat, list in pairs(Points.ByCategory()) do
        if itemCategories[cat] or cat == "chest" or cat == "boss" then
            for _, pt in ipairs(list) do
                queue[#queue + 1] = { id = pt.id, cat = cat, map = pt.map }
            end
        end
    end
    cursor = 1
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

local function check(entry)
    local map = BG3Atlas.Layer and BG3Atlas.Layer.CurrentMap()
    if entry.map ~= map or Found.IsFound(entry.id) then
        return
    end
    local ok, entity = pcall(Ext.Entity.Get, entry.id)
    if not ok then
        entity = nil
    end
    if itemCategories[entry.cat] then
        if entity then
            if P.Get(entity, "InventoryMember") then
                Found.SetFound(entry.id, true)
            else
                seenInWorld[entry.id] = true
            end
        elseif seenInWorld[entry.id] then
            Found.SetFound(entry.id, true)
        end
    elseif entry.cat == "chest" then
        if not entity then
            return
        end
        local n = containerCount(entity)
        if n and n > 0 then
            seenFull[entry.id] = true
        elseif n == 0 and seenFull[entry.id] then
            Found.SetFound(entry.id, true)
        end
    elseif entry.cat == "boss" then
        local health = entity and P.Get(entity, "Health")
        local hp = health and P.Get(health, "Hp")
        if type(hp) == "number" and hp <= 0 then
            Found.SetFound(entry.id, true)
        end
    end
end

local function step()
    if not running then
        return
    end
    local ok, err = pcall(function()
        if not queue then
            buildQueue()
        end
        local last = math.min(#queue, cursor + Detect.BatchSize - 1)
        for i = cursor, last do
            check(queue[i])
        end
        cursor = last + 1
        if cursor > #queue then
            cursor = 1
        end
    end)
    if not ok then
        P.Log("detect failed: " .. P.Str(err))
        running = false
        return
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
    Detect.Start()
end)
