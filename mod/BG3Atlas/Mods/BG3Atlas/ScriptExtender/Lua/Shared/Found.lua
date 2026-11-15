local Found = {}
BG3Atlas.Found = Found

Found.ModUuid = "09fefa51-cb5f-4d58-802e-fd6fb192e748"
Found.Var = "Found"

Ext.Vars.RegisterModVariable(Found.ModUuid, Found.Var, {
    Server = true,
    Client = true,
    WriteableOnServer = true,
    WriteableOnClient = true,
    SyncToClient = true,
    SyncToServer = true,
})

local cache = nil
local version = 0

local function vars()
    local ok, v = pcall(Ext.Vars.GetModVariables, Found.ModUuid)
    if ok then
        return v
    end
    return nil
end

local function load()
    if cache then
        return cache
    end
    local v = vars()
    local stored = v and v[Found.Var]
    cache = {}
    if type(stored) == "table" then
        for id, on in pairs(stored) do
            if on == true then
                cache[id] = true
            end
        end
    end
    return cache
end

function Found.IsFound(id)
    return load()[id] == true
end

function Found.SetFound(id, on)
    local set = load()
    if (set[id] == true) == (on == true) then
        return
    end
    set[id] = on and true or nil
    version = version + 1
    local copy = {}
    for k in pairs(set) do
        copy[k] = true
    end
    local v = vars()
    if v then
        v[Found.Var] = copy
    end
end

function Found.Version()
    return version
end

function Found.Reset()
    cache = nil
    version = version + 1
end

Ext.Events.SessionLoaded:Subscribe(function()
    Found.Reset()
end)
