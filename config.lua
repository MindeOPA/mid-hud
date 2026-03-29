Config = {}

-- Fuel system: 'auto', 'ox_fuel', 'LegacyFuel', 'ps-fuel', 'cdn-fuel', 'lj-fuel', 'native'
Config.FuelSystem = 'auto'

-- Voice system: 'auto', 'pma-voice', 'mumble-voip', 'saltychat', 'toko-voip'
Config.VoiceSystem = 'auto'

-- Status system: 'auto', 'esx', 'esx_status', 'qb-core', 'ox_core'
Config.StatusSystem = 'auto'

-- Speed unit: 'kmh' or 'mph'
Config.SpeedUnit = 'kmh'

-- HUD refresh rate (ms)
Config.UpdateInterval = 150

-- Hide HUD when dead
Config.HideOnDeath = true

-- Low status thresholds (%)
Config.LowHealthThreshold = 25
Config.LowArmorThreshold = 15
Config.LowHungerThreshold = 20
Config.LowThirstThreshold = 20

-- Speedometer elements
Config.ShowSpeedometer = true
Config.ShowRPM = true
Config.ShowFuel = true
Config.ShowGear = true

-- Location
Config.ShowStreetName = true
Config.ShowAreaName = true
Config.ShowCompass = true

-- Clock
Config.Use24HourFormat = true
Config.ShowRealTime = false
Config.TimeOffset = 2  -- UTC offset in hours (e.g. 2 for Lithuania UTC+2, -5 for EST)

-- Money
Config.ShowCash = true
Config.ShowBank = true

-- Status ring colors
Config.Colors = {
    health  = '#ff4757',
    armor   = '#3742fa',
    hunger  = '#ff6b35',
    thirst  = '#00d2d3',
    stamina = '#feca57',
    oxygen  = '#54a0ff',
    stress  = '#ee5a24'
}

-- Voice indicator
Config.ShowVoice = true

-- Player ID
Config.ShowPlayerId = true

-- Cinematic mode key (Z)
Config.CinematicKey = 20
