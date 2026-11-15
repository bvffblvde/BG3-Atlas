local P = BG3Atlas.Probe

local World = {}
BG3Atlas.World = World

World.SettleMs = 2000

local since = nil

local function isRunning(state)
    return P.Str(state):find("Running", 1, true) ~= nil
end

function World.Ready()
    local ok, state = pcall(Ext.Utils.GetGameState)
    if not ok or not isRunning(state) then
        since = nil
        return false
    end
    local now = Ext.Timer.MonotonicTime()
    if not since then
        since = now
    end
    return now - since >= World.SettleMs
end

Ext.Events.GameStateChanged:Subscribe(function(e)
    since = nil
    P.Log("game state " .. P.Str(e.FromState) .. " -> " .. P.Str(e.ToState))
end)
