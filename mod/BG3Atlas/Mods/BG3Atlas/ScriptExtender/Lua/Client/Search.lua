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

local folds = {
    ["\195\160"] = "a", ["\195\161"] = "a", ["\195\162"] = "a", ["\195\163"] = "a", ["\195\164"] = "a", ["\195\165"] = "a",
    ["\195\167"] = "c", ["\195\168"] = "e", ["\195\169"] = "e", ["\195\170"] = "e", ["\195\171"] = "e",
    ["\195\172"] = "i", ["\195\173"] = "i", ["\195\174"] = "i", ["\195\175"] = "i", ["\195\177"] = "n",
    ["\195\178"] = "o", ["\195\179"] = "o", ["\195\180"] = "o", ["\195\181"] = "o", ["\195\182"] = "o",
    ["\195\185"] = "u", ["\195\186"] = "u", ["\195\187"] = "u", ["\195\188"] = "u", ["\195\189"] = "y", ["\195\191"] = "y",
    ["\209\145"] = "\208\181",
}

function Search.Fold(s)
    s = Search.Lower(s)
    s = s:gsub("\195[\128-\158]", function(c)
        return "\195" .. string.char(c:byte(2) + 32)
    end)
    return (s:gsub("[\195\209][\128-\191]", function(c)
        return folds[c] or c
    end))
end

local index = nil

local function buildIndex()
    index = {}
    for _, list in pairs(Points.ByCategory()) do
        for _, pt in ipairs(list) do
            index[#index + 1] = { pt = pt, text = Search.Fold((pt.name or "") .. "\n" .. (pt.nameRu or "")) }
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
    local needle = Search.Fold(text):gsub("^%s+", ""):gsub("%s+$", "")
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
    local text = BG3Atlas.Locale.Text(Settings.Language())
    if #query < Search.MinLength then
        return text.searchHint
    end
    if total == 0 then
        return text.searchNone
    end
    if total > #results then
        return #results .. "/" .. total
    end
    return tostring(total)
end
