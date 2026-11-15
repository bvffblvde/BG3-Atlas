local P = BG3Atlas.Probe

local Points = {}
BG3Atlas.Points = Points

Points.Categories = Ext.Require("Client/Data/Categories.lua")

local raw = Ext.Require("Client/Data/Wilderness.lua")
local byCategory = {}
local counts = {}

for _, cat in ipairs(Points.Categories) do
    byCategory[cat] = {}
    counts[cat] = 0
end

for _, row in ipairs(raw) do
    local cat = row[2]
    local list = byCategory[cat]
    if list then
        list[#list + 1] = { id = row[1], x = row[3], y = row[4], name = row[5], nameRu = row[6], flags = row[7] }
        counts[cat] = counts[cat] + 1
    end
end

P.Log("points loaded: " .. #raw)

function Points.ByCategory()
    return byCategory
end

function Points.Counts()
    return counts
end
