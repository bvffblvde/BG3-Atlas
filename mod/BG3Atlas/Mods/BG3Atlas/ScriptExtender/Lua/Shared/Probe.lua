BG3Atlas = BG3Atlas or {}

local P = {}
BG3Atlas.Probe = P

P.Channel = "BG3Atlas_ProbeMarks"
P.Dir = "BG3Atlas/"

function P.Str(v)
    local ok, r = pcall(tostring, v)
    if ok then
        return r
    end
    return "?"
end

function P.Get(obj, key)
    local ok, r = pcall(function()
        return obj[key]
    end)
    if ok then
        return r
    end
    return nil
end

function P.Log(msg)
    Ext.Utils.Print("[BG3Atlas] " .. msg)
end

function P.Save(name, lines)
    local path = P.Dir .. name
    Ext.IO.SaveFile(path, table.concat(lines, "\n"))
    P.Log("saved Script Extender/" .. path .. " (" .. #lines .. " lines)")
end

function P.Pos(entity)
    local t = P.Get(entity, "Transform")
    if not t then
        return nil
    end
    local tr = P.Get(t, "Transform")
    if not tr then
        return nil
    end
    return P.Get(tr, "Translate")
end

function P.FormatPos(p)
    if not p then
        return "nil"
    end
    return string.format("%.2f %.2f %.2f", p[1], p[2], p[3])
end

function P.Uuid(entity)
    local u = P.Get(entity, "Uuid")
    if u then
        return P.Get(u, "EntityUuid")
    end
    return nil
end

P.Log("probe loaded, context " .. (Ext.IsServer() and "server" or "client"))
