ESX = exports['es_extended']:getSharedObject()

local hudOpen = true
local cinematic = false
local dead = false
local voiceLevel = 1
local stress = 0
local myServerId = 0

local floor = math.floor
local format = string.format
local speedMul = Config.SpeedUnit == 'kmh' and 3.6 or 2.236936
local compassDirs = { 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW' }
local hiddenComponents = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 17, 20, 21, 22 }

local function nui(data)
    SendNUIMessage(data)
end

local function getHeading(ped)
    local h = GetEntityHeading(ped)
    return compassDirs[floor(((h + 22.5) % 360) / 45) + 1] or 'N'
end

local function getStreetInfo(ped)
    local pos = GetEntityCoords(ped)
    local mainHash, crossHash = GetStreetNameAtCoord(pos.x, pos.y, pos.z)
    local street = GetStreetNameFromHashKey(mainHash)
    local cross = GetStreetNameFromHashKey(crossHash)
    if cross ~= '' then
        street = street .. ' / ' .. cross
    end
    return street, GetLabelText(GetNameOfZone(pos.x, pos.y, pos.z))
end

local statusSystem = nil

local function detectStatusSystem()
    if Config.StatusSystem ~= 'auto' then return Config.StatusSystem end
    if GetResourceState('qb-core') == 'started' then return 'qb-core' end
    if GetResourceState('ox_core') == 'started' then return 'ox_core' end
    if GetResourceState('esx_status') == 'started' then return 'esx_status' end
    return 'esx'
end

local function getHungerThirst()
    if not statusSystem then statusSystem = detectStatusSystem() end

    if statusSystem == 'qb-core' then
        local ok, QBCore = pcall(exports['qb-core'].GetCoreObject, exports['qb-core'])
        if ok and QBCore then
            local pd = QBCore.Functions.GetPlayerData()
            if pd and pd.metadata then
                return pd.metadata['hunger'] or 100, pd.metadata['thirst'] or 100
            end
        end
    elseif statusSystem == 'ox_core' then
        local ok, player = pcall(exports.ox_core.GetPlayer, exports.ox_core)
        if ok and player then
            local statuses = player.get and player:get('statuses')
            if statuses then
                return statuses.hunger or 100, statuses.thirst or 100
            end
        end
    elseif statusSystem == 'esx_status' then
        local hunger, thirst = 100, 100
        TriggerEvent('esx_status:getStatus', 'hunger', function(status)
            if type(status) == 'table' then
                hunger = (status.val or 1000000) / 10000
            elseif type(status) == 'number' then
                hunger = status / 10000
            end
        end)
        TriggerEvent('esx_status:getStatus', 'thirst', function(status)
            if type(status) == 'table' then
                thirst = (status.val or 1000000) / 10000
            elseif type(status) == 'number' then
                thirst = status / 10000
            end
        end)
        return hunger, thirst
    end

    local pd = ESX.GetPlayerData()
    if pd and pd.metadata then
        return pd.metadata['hunger'] or 100, pd.metadata['thirst'] or 100
    end
    return 100, 100
end

local function getStatus(ped)
    local hp = GetEntityHealth(ped) - 100
    if hp < 0 then hp = 0 end
    local maxHp = GetEntityMaxHealth(ped) - 100
    local pid = PlayerId()
    local oxy = GetPlayerUnderwaterTimeRemaining(pid) * 10
    if oxy > 100 then oxy = 100 end

    local hunger, thirst = getHungerThirst()

    return {
        health  = floor((hp / maxHp) * 100),
        armor   = GetPedArmour(ped),
        hunger  = floor(hunger),
        thirst  = floor(thirst),
        stamina = floor(100 - GetPlayerSprintStaminaRemaining(pid)),
        oxygen  = floor(oxy),
        stress  = stress
    }
end

local function getMoney()
    local cash, bank = 0, 0
    local pd = ESX.GetPlayerData()
    if pd and pd.accounts then
        for i = 1, #pd.accounts do
            local acc = pd.accounts[i]
            if acc.name == 'money' then
                cash = acc.money
            elseif acc.name == 'bank' then
                bank = acc.money
            end
        end
    end
    return cash, bank
end

local fuelSystem = nil

local function detectFuelSystem()
    if Config.FuelSystem ~= 'auto' then return Config.FuelSystem end
    local systems = { 'ox_fuel', 'ps-fuel', 'cdn-fuel', 'lj-fuel', 'LegacyFuel' }
    for i = 1, #systems do
        if GetResourceState(systems[i]) == 'started' then return systems[i] end
    end
    return 'native'
end

local function getFuel(veh)
    if not fuelSystem then fuelSystem = detectFuelSystem() end

    if fuelSystem == 'ox_fuel' then
        local ok, state = pcall(Entity, veh)
        if ok and state and state.state and state.state.fuel then
            return state.state.fuel
        end
    elseif fuelSystem == 'ps-fuel' then
        local ok, val = pcall(exports['ps-fuel'].GetFuel, exports['ps-fuel'], veh)
        if ok and val then return val end
    elseif fuelSystem == 'cdn-fuel' then
        local ok, val = pcall(exports['cdn-fuel'].GetFuel, exports['cdn-fuel'], veh)
        if ok and val then return val end
    elseif fuelSystem == 'lj-fuel' then
        local ok, val = pcall(exports['lj-fuel'].GetFuel, exports['lj-fuel'], veh)
        if ok and val then return val end
    elseif fuelSystem == 'LegacyFuel' then
        local ok, val = pcall(exports['LegacyFuel'].GetFuel, exports['LegacyFuel'], veh)
        if ok and val then return val end
    end

    return GetVehicleFuelLevel(veh) or 100.0
end

local function getVehicleData(veh)
    local fuel = getFuel(veh)

    local displayName = GetDisplayNameFromVehicleModel(GetEntityModel(veh))
    local label = GetLabelText(displayName)
    if label == 'NULL' then label = displayName end

    local ind = 0
    if GetVehicleIndicatorLights then
        local left = GetVehicleIndicatorLights(veh, 1)
        local right = GetVehicleIndicatorLights(veh, 0)
        if left == 1 and right == 1 then
            ind = 3
        elseif left == 1 then
            ind = 1
        elseif right == 1 then
            ind = 2
        end
    end

    local lights, highbeams = GetVehicleLightsState(veh)

    return {
        speed     = floor(GetEntitySpeed(veh) * speedMul),
        rpm       = GetVehicleCurrentRpm(veh),
        gear      = GetVehicleCurrentGear(veh),
        fuel      = floor(fuel),
        unit      = Config.SpeedUnit,
        label     = label,
        indicator = ind,
        lights    = lights == 1,
        highbeams = highbeams == 1,
        class     = GetVehicleClass(veh)
    }
end

CreateThread(function()
    Wait(1500)
    myServerId = GetPlayerServerId(PlayerId())

    RequestScaleformMovie('minimap')
    SetRadarBigmapEnabled(false, false)
    Wait(0)
    SetRadarBigmapEnabled(false, false)

    local resX, resY = GetActiveScreenResolution()
    local ar = resX / resY
    local baseAr = 1920 / 1080
    local off = 0
    if ar > baseAr then
        off = ((baseAr - ar) / 3.6) - 0.008
    end

    SetMinimapComponentPosition('minimap',      'L', 'B', -0.01 + off, -0.047, 0.15, 0.183)
    SetMinimapComponentPosition('minimap_mask',  'L', 'B', -0.01 + off,  0.0,   0.15, 0.183)
    SetMinimapComponentPosition('minimap_blur',  'L', 'B', -0.03 + off, -0.030, 0.29, 0.240)

    SetBlipAlpha(GetNorthRadarBlip(), 0)
    SetBigmapActive(false, false)
    SetMinimapClipType(0)
    Wait(50)
    SetBigmapActive(false, false)

    nui({ action = 'toggle', show = true })
    nui({
        action      = 'setConfig',
        colors      = Config.Colors,
        speedUnit   = Config.SpeedUnit,
        showCash    = Config.ShowCash,
        showBank    = Config.ShowBank,
        showVoice   = Config.ShowVoice,
        showCompass  = Config.ShowCompass,
        showPlayerId = Config.ShowPlayerId,
        use24h      = Config.Use24HourFormat
    })
end)

CreateThread(function()
    Wait(2000)
    while true do
        Wait(Config.UpdateInterval)
        if not hudOpen or cinematic then goto next end

        local ped = PlayerPedId()
        dead = IsEntityDead(ped)

        if Config.HideOnDeath and dead then
            nui({ action = 'setDead', dead = true })
            goto next
        end

        nui({ action = 'setDead', dead = false })

        local street, area = getStreetInfo(ped)
        local cash, bank = getMoney()
        local inVeh = IsPedInAnyVehicle(ped, false)

        nui({
            action     = 'update',
            status     = getStatus(ped),
            street     = street,
            area       = area,
            heading    = getHeading(ped),
            time       = Config.ShowRealTime
                and format('%02d:%02d', (os.date('!*t').hour + (Config.TimeOffset or 0)) % 24, os.date('!*t').min)
                or format('%02d:%02d', (GetClockHours() + (Config.TimeOffset or 0)) % 24, GetClockMinutes()),
            money      = { cash = cash, bank = bank },
            inVehicle  = inVeh,
            vehicle    = inVeh and getVehicleData(GetVehiclePedIsIn(ped, false)) or nil,
            playerId   = myServerId,
            voiceLevel = voiceLevel
        })

        ::next::
    end
end)

CreateThread(function()
    local minimap = RequestScaleformMovie('minimap')
    while true do
        Wait(0)

        for i = 1, #hiddenComponents do
            HideHudComponentThisFrame(hiddenComponents[i])
        end

        if minimap then
            BeginScaleformMovieMethod(minimap, 'SETUP_HEALTH_ARMOUR')
            ScaleformMovieMethodAddParamInt(3)
            EndScaleformMovieMethod()
        end

        local ped = PlayerPedId()
        if IsPedInAnyVehicle(ped, false) then
            local veh = GetVehiclePedIsIn(ped, false)
            if GetIsVehicleEngineRunning(veh) then
                DisableControlAction(0, 37, true)
            end
        end
    end
end)

RegisterKeyMapping('cinematicmode', 'Cinematic Mode', 'keyboard', 'Z')
RegisterCommand('cinematicmode', function()
    cinematic = not cinematic
    nui({ action = 'cinematic', hide = cinematic })
    DisplayRadar(not cinematic)
end, false)

RegisterNetEvent('esx:setJob', function(job)
    nui({ action = 'setJob', job = job.label, grade = job.grade_label })
end)

RegisterNetEvent('mid-hud:client:setStress', function(val)
    stress = val
end)

exports('ToggleHud', function(state)
    hudOpen = state
    nui({ action = 'toggle', show = state })
end)

exports('SetStress', function(val)
    stress = val
end)

local voiceSystem = nil

local function detectVoiceSystem()
    if Config.VoiceSystem ~= 'auto' then return Config.VoiceSystem end
    local systems = { 'pma-voice', 'mumble-voip', 'saltychat', 'toko-voip' }
    for i = 1, #systems do
        if GetResourceState(systems[i]) == 'started' then return systems[i] end
    end
    return 'pma-voice'
end

CreateThread(function()
    Wait(3000)
    voiceSystem = detectVoiceSystem()

    if voiceSystem == 'pma-voice' then
        while true do
            Wait(300)
            local ok, prox = pcall(function() return LocalPlayer.state.proximity end)
            if ok and prox and prox.index then
                voiceLevel = prox.index
            end
        end
    elseif voiceSystem == 'mumble-voip' then
        while true do
            Wait(300)
            local ok, mode = pcall(function()
                return LocalPlayer.state.voiceMode or MumbleGetVoiceChannelFromServerId(GetPlayerServerId(PlayerId()))
            end)
            if ok and mode and type(mode) == 'number' then voiceLevel = mode end
        end
    elseif voiceSystem == 'saltychat' then
        while true do
            Wait(500)
            local ok, range = pcall(exports.saltychat.GetVoiceRange, exports.saltychat)
            if ok and range then
                if range <= 3.0 then voiceLevel = 1
                elseif range <= 8.0 then voiceLevel = 2
                else voiceLevel = 3 end
            end
        end
    elseif voiceSystem == 'toko-voip' then
        while true do
            Wait(500)
            local ok, range = pcall(exports['toko-voip'].getProximity, exports['toko-voip'])
            if ok and range then
                if range <= 3.0 then voiceLevel = 1
                elseif range <= 8.0 then voiceLevel = 2
                else voiceLevel = 3 end
            end
        end
    end
end)

AddEventHandler('pma-voice:setTalkingMode', function(mode) voiceLevel = mode end)
AddEventHandler('mumble:SetVoiceData', function(mode) voiceLevel = mode end)
