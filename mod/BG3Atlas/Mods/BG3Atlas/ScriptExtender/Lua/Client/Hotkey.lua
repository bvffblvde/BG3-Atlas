local P = BG3Atlas.Probe

local Hotkey = {}
BG3Atlas.Hotkey = Hotkey

Hotkey.FoundKey = "F"
Hotkey.DebounceMs = 300
Hotkey.CommandMs = 120
Hotkey.ControllerBase = 3
Hotkey.PadFoundButton = "RightShoulder"
Hotkey.PadFogButton = "LeftShoulder"
Hotkey.GridAxis = "TriggerLeft"
Hotkey.TriggerThreshold = 0.5

local lastFound = -100000

function Hotkey.Accept(now, last)
    return now - last >= Hotkey.DebounceMs
end

function Hotkey.Fresh(seen, key, now)
    local last = seen[key]
    if last and now - last < Hotkey.CommandMs then
        return false
    end
    seen[key] = now
    return true
end

function Hotkey.DevicePlayer(which, owners)
    if type(which) ~= "number" or type(owners) ~= "table" then
        return nil
    end
    return owners[Hotkey.ControllerBase + which]
end

Hotkey.PressWindowMs = 300
local lastPress = { owner = nil, at = -100000 }

function Hotkey.NotePress(owner, now)
    lastPress.owner = owner
    lastPress.at = now
end

function Hotkey.AllowFor(player, now)
    if not lastPress.owner or now - lastPress.at > Hotkey.PressWindowMs then
        return true
    end
    return lastPress.owner == (player or 1)
end

function Hotkey.TriggerPressed(axis, value, was, open)
    return axis == Hotkey.GridAxis and value >= Hotkey.TriggerThreshold and not was and open == true
end

function Hotkey.PadFog(button, event, open)
    return button == Hotkey.PadFogButton and event == "KeyDown" and open == true
end

function Hotkey.PadTarget(button, event, players, owner)
    if button ~= Hotkey.PadFoundButton or event ~= "KeyDown" then
        return nil
    end
    if owner then
        for _, p in ipairs(players) do
            if p == owner then
                return p
            end
        end
        return nil
    end
    return players[1]
end

local deviceLogged = {}

local function playerDevices()
    local ok, owners = pcall(function()
        local im = Ext.Input.GetInputManager()
        if not im then
            return nil
        end
        local out = {}
        for i = 1, 12 do
            local d = im.PerDeviceData[i]
            local id = d and tonumber(d.DeviceId)
            local idx = d and tonumber(d.InputPlayerIndex)
            if id and idx and idx >= 0 and idx < 4 then
                out[id] = idx + 1
            end
        end
        return out
    end)
    return ok and owners or nil
end

local dumped = false

local function dumpInput()
    if dumped then
        return
    end
    dumped = true
    local ok, err = pcall(function()
        local im = Ext.Input.GetInputManager()
        local scheme = im.InputScheme
        for p = 1, 4 do
            local list = {}
            for _, d in pairs(scheme.DeviceLists[p] or {}) do
                list[#list + 1] = tostring(d)
            end
            P.Log("input player " .. p .. " devices: " .. table.concat(list, ","))
        end
        for i = 1, 12 do
            local d = im.PerDeviceData[i]
            if d then
                P.Log("input device slot " .. i .. ": id " .. tostring(d.DeviceId) .. " player " .. tostring(d.InputPlayerIndex))
            end
        end
        local wanted = { leftshoulder = true, rightshoulder = true, lefttrigger = true }
        for p = 1, 2 do
            for eventId, bindings in pairs(scheme.InputBindings[p] or {}) do
                for _, b in pairs(bindings) do
                    local raw = tostring(b.InputId)
                    if wanted[raw] then
                        local def = im.InputDefinitions[eventId]
                        local name = def and tostring(def.EventName) or "?"
                        if name:sub(1, 2) == "UI" then
                            P.Log("input binding player " .. p .. " " .. raw .. " -> " .. name)
                        end
                    end
                end
            end
        end
    end)
    if not ok then
        P.Log("input dump failed: " .. P.Str(err))
    end
end

local function ownerOf(which)
    dumpInput()
    local ids = playerDevices()
    local owner = Hotkey.DevicePlayer(tonumber(which), ids)
    local key = tostring(which) .. ">" .. tostring(owner)
    if not deviceLogged[key] then
        deviceLogged[key] = true
        local shown = "unreadable"
        if ids then
            local parts = {}
            for id, p in pairs(ids) do
                parts[#parts + 1] = tostring(id) .. "=" .. tostring(p)
            end
            table.sort(parts)
            shown = table.concat(parts, " ")
        end
        P.Log("pad device " .. key .. " -> player " .. tostring(owner) .. " (player devices " .. shown .. ")")
    end
    return owner
end

local function mapOpen(Layer, owner)
    if owner then
        return Layer.PadMapVisible(owner)
    end
    return Layer.PadMapVisible()
end

Ext.Events.KeyInput:Subscribe(function(e)
    if not e.Pressed or e.Repeat or P.Str(e.Event) ~= "KeyDown" or P.Str(e.Key) ~= Hotkey.FoundKey then
        return
    end
    local now = Ext.Timer.MonotonicTime()
    if not Hotkey.Accept(now, lastFound) then
        return
    end
    lastFound = now
    local Layer = BG3Atlas.Layer
    if not Layer or not Layer.MouseMapVisible() then
        return
    end
    if BG3Atlas.Panel and BG3Atlas.Panel.SearchFocused() then
        return
    end
    Layer.ToggleHovered(1)
end)

local swallowUp = {}
local swallowFogUp = {}

Ext.Events.ControllerButtonInput:Subscribe(function(e)
    local button = P.Str(e.Button)
    if P.Str(e.Event) == "KeyDown" then
        Hotkey.NotePress(ownerOf(e.DeviceId), Ext.Timer.MonotonicTime())
    end
    if button ~= Hotkey.PadFogButton and button ~= Hotkey.PadFoundButton then
        return
    end
    local event = P.Str(e.Event)
    local device = tostring(e.DeviceId)
    local Layer = BG3Atlas.Layer
    if button == Hotkey.PadFogButton then
        if event == "KeyUp" then
            if swallowFogUp[device] and e.CanPreventAction then
                e:PreventAction()
            end
            swallowFogUp[device] = nil
            return
        end
        local owner = ownerOf(e.DeviceId)
        if Layer and Hotkey.PadFog(button, event, mapOpen(Layer, owner)) then
            if e.CanPreventAction then
                e:PreventAction()
                swallowFogUp[device] = true
            end
            Layer.RequestFogToggle(owner or Layer.PadOpenPlayer())
        end
        return
    end
    if event == "KeyUp" then
        if swallowUp[device] and e.CanPreventAction then
            e:PreventAction()
        end
        swallowUp[device] = nil
        return
    end
    if not Layer then
        return
    end
    local owner = ownerOf(e.DeviceId)
    local player = Hotkey.PadTarget(button, event, Layer.PadHoverPlayers(), owner)
    if not player then
        return
    end
    if e.CanPreventAction then
        e:PreventAction()
        swallowUp[device] = true
    end
    Layer.RequestToggle(player)
end)

local triggerDown = {}

Ext.Events.ControllerAxisInput:Subscribe(function(e)
    local axis = P.Str(e.Axis)
    if axis ~= Hotkey.GridAxis then
        return
    end
    local device = tostring(e.DeviceId)
    local value = tonumber(e.Value) or 0
    local Layer = BG3Atlas.Layer
    local was = triggerDown[device] == true
    local pressing = value >= Hotkey.TriggerThreshold
    if pressing == was and not pressing then
        return
    end
    local owner = ownerOf(e.DeviceId)
    local open = Layer ~= nil and mapOpen(Layer, owner)
    if Hotkey.TriggerPressed(axis, value, was, open) then
        Layer.RequestGridToggle(owner or Layer.PadOpenPlayer())
    end
    triggerDown[device] = pressing
    if open and e.CanPreventAction then
        e:PreventAction()
    end
end)
