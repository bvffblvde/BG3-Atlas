local S = {}
BG3Atlas.Settings = S

S.File = "BG3Atlas/settings.json"

local state = { disabled = {} }

function S.Parse(text)
    local out = { disabled = {} }
    if type(text) ~= "string" or text == "" then
        return out
    end
    local ok, data = pcall(Ext.Json.Parse, text)
    if not ok or type(data) ~= "table" or type(data.disabled) ~= "table" then
        return out
    end
    for k, v in pairs(data.disabled) do
        if v == true and type(k) == "string" then
            out.disabled[k] = true
        end
    end
    return out
end

function S.Load()
    local ok, text = pcall(Ext.IO.LoadFile, S.File)
    state = S.Parse(ok and text or nil)
end

function S.Save()
    local disabled = {}
    local any = false
    for k in pairs(state.disabled) do
        disabled[k] = true
        any = true
    end
    local text = any and Ext.Json.Stringify({ disabled = disabled }) or '{"disabled":{}}'
    Ext.IO.SaveFile(S.File, text)
end

function S.IsEnabled(cat)
    return not state.disabled[cat]
end

function S.SetEnabled(cat, on)
    state.disabled[cat] = (not on) or nil
end

function S.SetAll(categories, on)
    for _, cat in ipairs(categories) do
        S.SetEnabled(cat, on)
    end
end
