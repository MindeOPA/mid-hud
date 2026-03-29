fx_version 'cerulean'
game 'gta5'

author 'MidDev'
description 'Mid HUD'
version '1.0.0'

lua54 'yes'

shared_scripts { 'config.lua' }
client_scripts { 'client/main.lua' }
server_scripts { 'server/main.lua' }

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js'
}
