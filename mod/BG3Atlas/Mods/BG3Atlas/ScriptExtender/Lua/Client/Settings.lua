local S = {}
BG3Atlas.Settings = S

S.File = "BG3Atlas/settings.json"

local state = { disabled = {}, hideFound = false, fogOnly = false }
local lang = nil

function S.Parse(text)
    local out = { disabled = {}, hideFound = false, fogOnly = false }
    if type(text) ~= "string" or text == "" then
        return out
    end
    local ok, data = pcall(Ext.Json.Parse, text)
    if not ok or type(data) ~= "table" then
        return out
    end
    out.hideFound = data.hideFound == true
    out.fogOnly = data.fogOnly == true
    if type(data.disabled) == "table" then
        for k, v in pairs(data.disabled) do
            if v == true and type(k) == "string" then
                out.disabled[k] = true
            end
        end
    end
    return out
end

function S.Load()
    local ok, text = pcall(Ext.IO.LoadFile, S.File)
    state = S.Parse(ok and text or nil)
end

function S.Save()
    local parts = {}
    for k in pairs(state.disabled) do
        parts[#parts + 1] = '"' .. k .. '":true'
    end
    table.sort(parts)
    local text = '{"disabled":{' .. table.concat(parts, ",") .. '},"hideFound":' .. (state.hideFound and "true" or "false") .. ',"fogOnly":' .. (state.fogOnly and "true" or "false") .. "}"
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

function S.HideFound()
    return state.hideFound == true
end

function S.SetHideFound(on)
    state.hideFound = on == true
end

function S.FogOnly()
    return state.fogOnly == true
end

function S.SetFogOnly(on)
    state.fogOnly = on == true
end

function S.Language()
    if lang then
        return lang
    end
    local ok, text = pcall(function()
        return Ext.Loca.GetTranslatedString("h2020fdf6g224eg40cfg80ecg91fed5d32d11")
    end)
    lang = (ok and type(text) == "string" and text:find("[\208\209]")) and "ru" or "en"
    return lang
end
