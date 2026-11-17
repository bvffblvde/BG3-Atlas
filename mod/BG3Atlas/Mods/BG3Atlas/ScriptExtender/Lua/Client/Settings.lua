local S = {}
BG3Atlas.Settings = S

S.File = "BG3Atlas/settings.json"
S.DefaultOff = { container = true, remains = true }

local state = { disabled = {}, enabled = {}, hideFound = false, fogOnly = true, mapStyle = 0, view = {} }

local function validStyle(v)
    local n = tonumber(v)
    if n == 0 or n == 1 or n == 2 then
        return n
    end
    return nil
end
local lang = nil

function S.Parse(text)
    local out = { disabled = {}, enabled = {}, hideFound = false, fogOnly = true, mapStyle = 0, view = {} }
    if type(text) ~= "string" or text == "" then
        return out
    end
    local ok, data = pcall(Ext.Json.Parse, text)
    if not ok or type(data) ~= "table" then
        return out
    end
    out.hideFound = data.hideFound == true
    out.fogOnly = data.fogOnly ~= false
    local style = validStyle(data.mapStyle)
    if style then
        out.mapStyle = style
    elseif data.hideGrid == true then
        out.mapStyle = 1
    end
    out.view["1"] = { fogOnly = out.fogOnly, mapStyle = out.mapStyle }
    if type(data.view) == "table" then
        for k, v in pairs(data.view) do
            local key = tostring(k)
            if type(v) == "table" and key ~= "1" then
                out.view[key] = { fogOnly = v.fogOnly ~= false, mapStyle = validStyle(v.mapStyle) or 0 }
            end
        end
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
    local views = {}
    for k, v in pairs(state.view or {}) do
        views[#views + 1] = '"' .. k .. '":{"fogOnly":' .. (v.fogOnly and "true" or "false") .. ',"mapStyle":' .. tostring(v.mapStyle or 0) .. "}"
    end
    table.sort(views)
    local first = S.View(1)
    state.fogOnly = first.fogOnly
    state.mapStyle = first.mapStyle
    local text = '{"disabled":' .. jsonSet(state.disabled) .. ',"enabled":' .. jsonSet(state.enabled) .. ',"hideFound":' .. (state.hideFound and "true" or "false") .. ',"fogOnly":' .. (state.fogOnly and "true" or "false") .. ',"mapStyle":' .. tostring(state.mapStyle or 0) .. ',"view":{' .. table.concat(views, ",") .. "}" .. (state.language and (',"language":"' .. state.language .. '"') or "") .. "}"
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

function S.View(player)
    state.view = state.view or {}
    local key = tostring(player or 1)
    local v = state.view[key]
    if not v then
        v = { fogOnly = state.fogOnly ~= false, mapStyle = validStyle(state.mapStyle) or 0 }
        state.view[key] = v
    end
    return v
end

function S.MapStyle(player)
    return S.View(player).mapStyle or 0
end

function S.NextMapStyle(player)
    local v = S.View(player)
    v.mapStyle = ((v.mapStyle or 0) + 1) % 3
end

function S.StyleOpacity(style, grid)
    if style == 1 then
        return "0.0", "1"
    elseif style == 2 then
        return "0.0", tostring(S.ClearFogOpacity)
    end
    return tostring(grid), "1"
end

function S.FogOnly(player)
    return S.View(player).fogOnly == true
end

function S.SetFogOnly(on, player)
    S.View(player).fogOnly = on == true
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
    BG3Atlas.Probe.Log("language " .. lang .. " (probe text: " .. tostring(ok and text or nil) .. ", forced: " .. tostring(state.language) .. ")")
    return lang
end
