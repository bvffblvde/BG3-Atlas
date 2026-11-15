local P = BG3Atlas.Probe

local Points = {}
BG3Atlas.Points = Points

Points.Categories = Ext.Require("Client/Data/Categories.lua")
Points.Maps = {}
local origins = {}
for _, entry in ipairs(Ext.Require("Client/Data/Maps.lua")) do
    Points.Maps[#Points.Maps + 1] = entry[1]
    origins[entry[1]] = { x = entry[2], z = entry[3] }
end

local byCategory = {}
local counts = {}
local total = 0

for _, cat in ipairs(Points.Categories) do
    byCategory[cat] = {}
end

for _, map in ipairs(Points.Maps) do
    counts[map] = {}
    for _, cat in ipairs(Points.Categories) do
        counts[map][cat] = 0
    end
    local rows = Ext.Require("Client/Data/Points_" .. map .. ".lua")
    for _, row in ipairs(rows) do
        local cat = row[2]
        local list = byCategory[cat]
        if list then
            list[#list + 1] = { id = row[1], x = row[3], y = row[4], name = row[5], nameRu = row[6], flags = row[7], submap = row[8], floor = row[9], map = map }
            counts[map][cat] = counts[map][cat] + 1
            total = total + 1
        end
    end
end

P.Log("points loaded: " .. total .. " on " .. #Points.Maps .. " maps")

function Points.ByCategory()
    return byCategory
end

function Points.Counts(map)
    return counts[map] or {}
end

function Points.ToLocal(map, x, z)
    local o = origins[map]
    if not o then
        return nil, nil
    end
    return x - o.x, o.z - z
end

function Points.HasMap(map)
    return counts[map] ~= nil
end
