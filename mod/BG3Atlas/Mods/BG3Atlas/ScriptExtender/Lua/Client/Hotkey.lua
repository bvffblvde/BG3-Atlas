local P = BG3Atlas.Probe

local Hotkey = {}
BG3Atlas.Hotkey = Hotkey

Hotkey.FoundKey = "F"

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
