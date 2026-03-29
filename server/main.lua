ESX = exports['es_extended']:getSharedObject()

RegisterNetEvent('mid-hud:server:getStress', function()
    local src = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end
    TriggerClientEvent('mid-hud:client:setStress', src, xPlayer.getMeta('stress') or 0)
end)

ESX.RegisterServerCallback('mid-hud:getPlayerData', function(src, cb)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return cb(nil) end
    cb({
        job = xPlayer.getJob(),
        accounts = xPlayer.getAccounts()
    })
end)

RegisterNetEvent('mid-hud:server:notify', function(target, msg, nType, dur)
    TriggerClientEvent('mid-hud:client:notify', target, msg, nType, dur)
end)
