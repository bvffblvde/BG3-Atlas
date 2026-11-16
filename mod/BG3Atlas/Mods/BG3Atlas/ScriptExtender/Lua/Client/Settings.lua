local S = {}
BG3Atlas.Settings = S

S.File = "BG3Atlas/settings.json"
S.DefaultOff = { container = true, remains = true }

local state = { disabled = {}, enabled = {}, hideFound = false, fogOnly = true, hideGrid = false }
local lang = nil

function S.Parse(text)
    local out = { disabled = {}, enabled = {}, hideFound = false, fogOnly = true, hideGrid = false }
    if type(text) ~= "string" or text == "" then
        return out
    end
    local ok, data = pcall(Ext.Json.Parse, text)
    if not ok or type(data) ~= "table" then
        return out
    end
    out.hideFound = data.hideFound == true
    out.fogOnly = data.fogOnly ~= false
    out.hideGrid = data.hideGrid == true
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
    local text = '{"disabled":' .. jsonSet(state.disabled) .. ',"enabled":' .. jsonSet(state.enabled) .. ',"hideFound":' .. (state.hideFound and "true" or "false") .. ',"fogOnly":' .. (state.fogOnly and "true" or "false") .. ',"hideGrid":' .. (state.hideGrid and "true" or "false") .. (state.language and (',"language":"' .. state.language .. '"') or "") .. "}"
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

function S.HideGrid()
    return state.hideGrid == true
end

function S.SetHideGrid(on)
    state.hideGrid = on == true
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
