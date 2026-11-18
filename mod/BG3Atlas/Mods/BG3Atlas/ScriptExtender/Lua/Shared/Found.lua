local Found = {}
BG3Atlas.Found = Found

Found.ModUuid = "09fefa51-cb5f-4d58-802e-fd6fb192e748"
Found.Var = "Found"
Found.Channel = "BG3Atlas_Found"

Ext.Vars.RegisterModVariable(Found.ModUuid, Found.Var, {
    Server = true,
    Client = true,
    WriteableOnServer = true,
    WriteableOnClient = true,
    SyncToClient = true,
    SyncToServer = true,
})

local cache = nil
local synced = false
local version = 0

local function vars()
    local ok, v = pcall(Ext.Vars.GetModVariables, Found.ModUuid)
    if ok then
        return v
    end
    return nil
end

local function load()
    if cache and synced then
        return cache
    end
    local v = vars()
    local stored = v and v[Found.Var]
    if type(stored) == "table" then
        local fresh = {}
        for id, on in pairs(stored) do
            if type(on) == "boolean" then
                fresh[id] = on
            end
        end
        if cache then
            for id, on in pairs(cache) do
                fresh[id] = on
            end
            version = version + 1
        end
        cache = fresh
        synced = true
    elseif not cache then
        cache = {}
    end
    return cache
end

local codes = { on = true, off = false, clear = "clear" }

function Found.Encode(id, value)
    local code = "clear"
    if value == true then
        code = "on"
    elseif value == false then
        code = "off"
    end
    return code .. ":" .. id
end

function Found.Decode(payload)
    if type(payload) ~= "string" then
        return nil
    end
    local code, id = payload:match("^(%a+):(.+)$")
    local value = codes[code]
    if not id or value == nil then
        return nil
    end
    if value == "clear" then
        return id, nil
    end
    return id, value
end

function Found.Apply(stored, id, value)
    local copy = {}
    if type(stored) == "table" then
        for k, on in pairs(stored) do
            copy[k] = on
        end
    end
    copy[id] = value
    return copy
end

function Found.Prime()
    load()
end

function Found.IsFound(id)
    return load()[id] == true
end

function Found.IsBlocked(id)
    return load()[id] == false
end

local function store(id, value)
    local set = load()
    if set[id] == value then
        return
    end
    set[id] = value
    version = version + 1
    if Ext.IsClient() then
        local ok, err = pcall(Ext.ClientNet.PostMessageToServer, Found.Channel, Found.Encode(id, value))
        if not ok and BG3Atlas.Probe then
            BG3Atlas.Probe.Log("found message failed: " .. tostring(err))
        end
        return
    end
    local v = vars()
    if v then
        v[Found.Var] = Found.Apply(v[Found.Var], id, value)
    end
end

function Found.SetFound(id, on)
    local set = load()
    if set[id] == false and on then
        return
    end
    if (set[id] == true) == (on == true) then
        return
    end
    store(id, on and true or nil)
end

function Found.Toggle(id)
    local on = not Found.IsFound(id)
    store(id, on)
    return on
end

function Found.Version()
    return version
end

function Found.Reset()
    cache = nil
    synced = false
    version = version + 1
end

if Ext.IsServer() then
    Ext.RegisterNetListener(Found.Channel, function(_, payload)
        local id, value = Found.Decode(payload)
        if not id then
            return
        end
        local v = vars()
        if v then
            v[Found.Var] = Found.Apply(v[Found.Var], id, value)
            if BG3Atlas.Probe then
                BG3Atlas.Probe.Log("found saved on server " .. id .. " " .. tostring(value))
            end
        end
    end)
end

Ext.Events.SessionLoaded:Subscribe(function()
    Found.Reset()
end)
