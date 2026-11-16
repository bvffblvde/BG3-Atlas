local S = {}
BG3Atlas.Settings = S

S.File = "BG3Atlas/settings.json"
S.DefaultOff = { container = true, remains = true }

local state = { disabled = {}, enabled = {}, hideFound = false, fogOnly = true, mapStyle = 0 }
local lang = nil

function S.Parse(text)
    local out = { disabled = {}, enabled = {}, hideFound = false, fogOnly = true, mapStyle = 0 }
    if type(text) ~= "string" or text == "" then
        return out
    end
    local ok, data = pcall(Ext.Json.Parse, text)
    if not ok or type(data) ~= "table" then
        return out
    end
    out.hideFound = data.hideFound == true
    out.fogOnly = data.fogOnly ~= false
    local style = tonumber(data.mapStyle)
    if style == 0 or style == 1 or style == 2 then
        out.mapStyle = style
    elseif data.hideGrid == true then
        out.mapStyle = 1
    end
    if type(data.language) == "string" and data.language ~= "" then
        out.language = data.language
    end
    for _, field in ipairs({ "disabled", "enabled" }) do
        if type(data[field]) == "table" then
            for k, v in pairs(data[field]) do
                if v == true and type(k) == "string" then
                    out[field][k] = true
                end
            end
        end
    end
    return out
end

function S.Load()
    local ok, text = pcall(Ext.IO.LoadFile, S.File)
    state = S.Parse(ok and text or nil)
end

local function jsonSet(set)
    local parts = {}
    for k in pairs(set) do
        parts[#parts + 1] = '"' .. k .. '":true'
    end
    table.sort(parts)
    return "{" .. table.concat(parts, ",") .. "}"
end

function S.Save()
    local text = '{"disabled":' .. jsonSet(state.disabled) .. ',"enabled":' .. jsonSet(state.enabled) .. ',"hideFound":' .. (state.hideFound and "true" or "false") .. ',"fogOnly":' .. (state.fogOnly and "true" or "false") .. ',"mapStyle":' .. tostring(state.mapStyle or 0) .. (state.language and (',"language":"' .. state.language .. '"') or "") .. "}"
    Ext.IO.SaveFile(S.File, text)
end

function S.IsEnabled(cat)
    if S.DefaultOff[cat] then
        return state.enabled[cat] == true
    end
    return not state.disabled[cat]
end

function S.SetEnabled(cat, on)
    if S.DefaultOff[cat] then
        state.enabled[cat] = on and true or nil
    else
        state.disabled[cat] = (not on) or nil
    end
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

S.ClearFogOpacity = 0.8

function S.MapStyle()
    return state.mapStyle or 0
end

function S.NextMapStyle()
    state.mapStyle = ((state.mapStyle or 0) + 1) % 3
end

function S.StyleOpacity(style, grid)
    if style == 1 then
        return "0.0", "1"
    elseif style == 2 then
        return "0.0", tostring(S.ClearFogOpacity)
    end
    return tostring(grid), "1"
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
    if state.language then
        lang = state.language
    else
        lang = BG3Atlas.Locale.Detect(ok and text or nil)
    end
    return lang
end
