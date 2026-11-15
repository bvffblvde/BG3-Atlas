local Submaps = {}
BG3Atlas.Submaps = Submaps

local boxesByMap = {}
for _, map in ipairs(BG3Atlas.Points.Maps) do
    boxesByMap[map] = Ext.Require("Client/Data/Submaps_" .. map .. ".lua")
end

local function cross(ax, ay, az, bx, by, bz)
    return ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx
end

local function contains(b, x, y, z)
    local vx, vy, vz = x - b[3], y - b[4], z - b[5]
    local ux, uy, uz, w = -b[9], -b[10], -b[11], b[12]
    local tx, ty, tz = cross(ux, uy, uz, vx, vy, vz)
    tx, ty, tz = 2 * tx, 2 * ty, 2 * tz
    local cx, cy, cz = cross(ux, uy, uz, tx, ty, tz)
    local lx, ly, lz = vx + w * tx + cx, vy + w * ty + cy, vz + w * tz + cz
    return math.abs(lx) <= b[6] and math.abs(ly) <= b[7] and math.abs(lz) <= b[8]
end

function Submaps.Assign(map, x, y, z)
    local building = nil
    for _, b in ipairs(boxesByMap[map] or {}) do
        if b[1] ~= nil and contains(b, x, y, z) then
            if not building or b[13] < building[13] then
                building = b
            end
        end
    end
    if building then
        return building[1], building[2]
    end
    return nil, nil
end

function Submaps.Key(map, submap, floor)
    if submap == nil then
        return tostring(map) .. "|surface"
    end
    return tostring(map) .. "|" .. submap .. "#" .. tostring(floor or 0)
end
