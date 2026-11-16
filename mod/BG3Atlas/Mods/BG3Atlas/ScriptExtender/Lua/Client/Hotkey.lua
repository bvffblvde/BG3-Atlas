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

function Hotkey.DevicePlayer(which, playerDevices)
    if type(which) ~= "number" or type(playerDevices) ~= "table" then
        return nil
    end
    local id = Hotkey.ControllerBase + which
    for i = 1, 4 do
        if playerDevices[i] == id then
            return i
        end
    end
    return nil
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
    local ok, ids = pcall(function()
        local im = Ext.Input.GetInputManager()
        local list = im and im.PlayerDeviceIDs
        if not list then
            return nil
        end
        local out = {}
        for i = 1, 4 do
            out[i] = tonumber(list[i])
        end
        return out
    end)
    return ok and ids or nil
end

local function ownerOf(which)
    local ids = playerDevices()
    local owner = Hotkey.DevicePlayer(tonumber(which), ids)
    local key = tostring(which)
    if not deviceLogged[key] then
        deviceLogged[key] = true
        local shown = ids and table.concat({ tostring(ids[1]), tostring(ids[2]), tostring(ids[3]), tostring(ids[4]) }, ",") or "unreadable"
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
            Layer.RequestFogToggle()
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
        Layer.RequestGridToggle()
    end
    triggerDown[device] = pressing
    if open and e.CanPreventAction then
        e:PreventAction()
    end
end)
