local P = BG3Atlas.Probe

local Hotkey = {}
BG3Atlas.Hotkey = Hotkey

Hotkey.FoundKey = "F"
Hotkey.DebounceMs = 300

local lastFound = -100000

function Hotkey.Accept(now, last)
    return now - last >= Hotkey.DebounceMs
end
Hotkey.PadFoundButton = "RightShoulder"
Hotkey.PadFogButton = "LeftShoulder"

function Hotkey.PadFog(button, event, open)
    return button == Hotkey.PadFogButton and event == "KeyDown" and open == true
end

function Hotkey.PadTarget(button, event, players)
    if button ~= Hotkey.PadFoundButton or event ~= "KeyDown" then
        return nil
    end
    return players[1]
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

local swallowUp = false
local swallowFogUp = false

Ext.Events.ControllerButtonInput:Subscribe(function(e)
    local button = P.Str(e.Button)
    local event = P.Str(e.Event)
    if button == Hotkey.PadFogButton then
        if event == "KeyUp" then
            if swallowFogUp and e.CanPreventAction then
                e:PreventAction()
            end
            swallowFogUp = false
            return
        end
        local Layer = BG3Atlas.Layer
        if Layer and Hotkey.PadFog(button, event, Layer.PadMapVisible()) then
            if e.CanPreventAction then
                e:PreventAction()
                swallowFogUp = true
            end
            Layer.RequestFogToggle()
        end
        return
    end
    if button ~= Hotkey.PadFoundButton then
        return
    end
    if event == "KeyUp" then
        if swallowUp and e.CanPreventAction then
            e:PreventAction()
        end
        swallowUp = false
        return
    end
    local Layer = BG3Atlas.Layer
    if not Layer then
        return
    end
    local player = Hotkey.PadTarget(button, event, Layer.PadHoverPlayers())
    if not player then
        return
    end
    if e.CanPreventAction then
        e:PreventAction()
        swallowUp = true
    end
    Layer.RequestToggle(player)
end)
