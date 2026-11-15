local Points = BG3Atlas.Points
local Settings = BG3Atlas.Settings

local Search = {}
BG3Atlas.Search = Search

Search.MaxResults = 80
Search.MinLength = 2

local query = ""
local results = {}
local total = 0
local version = 0

function Search.Lower(s)
    s = string.lower(s)
    s = s:gsub("\208([\144-\159])", function(c)
        return "\208" .. string.char(c:byte() + 32)
    end)
    s = s:gsub("\208([\160-\175])", function(c)
        return "\209" .. string.char(c:byte() - 32)
    end)
    s = s:gsub("\208\129", "\209\145")
    return s
end

local index = nil

local function buildIndex()
    index = {}
    for _, list in pairs(Points.ByCategory()) do
        for _, pt in ipairs(list) do
            index[#index + 1] = { pt = pt, text = Search.Lower((pt.name or "") .. "\n" .. (pt.nameRu or "")) }
        end
    end
end

function Search.Set(text)
    text = type(text) == "string" and text or ""
    if text == query then
        return
    end
    query = text
    results = {}
    total = 0
    local needle = Search.Lower(text):gsub("^%s+", ""):gsub("%s+$", "")
    if #needle >= Search.MinLength then
        if not index then
            buildIndex()
        end
        for _, entry in ipairs(index) do
            if entry.text:find(needle, 1, true) then
                total = total + 1
                if #results < Search.MaxResults then
                    results[#results + 1] = entry.pt
                end
            end
        end
    end
    version = version + 1
end

function Search.Query()
    return query
end

function Search.Results()
    return results
end

function Search.Version()
    return version
end

function Search.Hint()
    local ru = Settings.Language() == "ru"
    if #query < Search.MinLength then
        return ru and "поиск" or "search"
    end
    if total == 0 then
        return ru and "ничего" or "no matches"
    end
    if total > #results then
        return #results .. "/" .. total
    end
    return tostring(total)
end
