local Submaps = {}
BG3Atlas.Submaps = Submaps

local boxes = Ext.Require("Client/Data/Submaps.lua")

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

function Submaps.Assign(x, y, z)
    local building, region = nil, nil
    for _, b in ipairs(boxes) do
        if contains(b, x, y, z) then
            if b[1] ~= nil then
                if not building or b[13] < building[13] then
                    building = b
                end
            elseif not region or b[13] < region[13] then
                region = b
            end
        end
    end
    if building then
        return building[1], building[2]
    end
    return nil, nil
end

function Submaps.Key(submap, floor)
    if submap == nil then
        return "surface"
    end
    return submap .. "#" .. tostring(floor or 0)
end
