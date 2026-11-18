local Guard = {}
BG3Atlas.Guard = Guard

function Guard.Settled(state, names, now, ms)
    local current = {}
    for _, n in ipairs(names) do
        current[n] = true
    end
    for n in pairs(state.seen or {}) do
        if not current[n] then
            state.since = now
            break
        end
    end
    state.seen = current
    return not state.since or now - state.since >= ms
end
