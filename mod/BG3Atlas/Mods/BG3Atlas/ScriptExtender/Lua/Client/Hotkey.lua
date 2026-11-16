local P = BG3Atlas.Probe

local Hotkey = {}
BG3Atlas.Hotkey = Hotkey

Hotkey.FoundKey = "F"
Hotkey.PadFoundButton = "RightShoulder"

function Hotkey.PadTarget(button, event, players)
    if button ~= Hotkey.PadFoundButton or event ~= "KeyDown" then
        return nil
    end
    return players[1]
end

Ext.Events.KeyInput:Subscribe(function(e)
    if not e.Pressed or e.Repeat or P.Str(e.Key) ~= Hotkey.FoundKey then
        return
    end
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

Ext.Events.ControllerButtonInput:Subscribe(function(e)
    local button = P.Str(e.Button)
    if button ~= Hotkey.PadFoundButton then
        return
    end
    local event = P.Str(e.Event)
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
