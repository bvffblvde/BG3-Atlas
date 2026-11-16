local Locale = {}
BG3Atlas.Locale = Locale

local tables = {}
local probes = {}

function Locale.Add(code, text, probe)
    tables[code] = text
    if probe then
        probes[probe] = code
    end
end

function Locale.Raw()
    return tables
end

function Locale.Detect(probeText)
    if type(probeText) == "string" and probes[probeText] then
        return probes[probeText]
    end
    return "en"
end

local merged = {}

function Locale.Text(code)
    if merged[code] then
        return merged[code]
    end
    local base = tables.en or {}
    local own = tables[code] or {}
    local out = {}
    for k, v in pairs(base) do
        out[k] = v
    end
    for k, v in pairs(own) do
        out[k] = v
    end
    merged[code] = out
    return out
end
