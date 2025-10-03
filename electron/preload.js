const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Settings
    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    updateSettings: (settings) => ipcRenderer.invoke('db:updateSettings', settings),

    // Farmers
    getFarmers: (params) => ipcRenderer.invoke('db:getFarmers', params),
    getFarmer: (id) => ipcRenderer.invoke('db:getFarmer', id),
    addFarmer: (farmer) => ipcRenderer.invoke('db:addFarmer', farmer),
    updateFarmer: (id, farmer) => ipcRenderer.invoke('db:updateFarmer', id, farmer),
    deleteFarmer: (id) => ipcRenderer.invoke('db:deleteFarmer', id),

    // Mills
    getMills: (params) => ipcRenderer.invoke('db:getMills', params),
    getMill: (id) => ipcRenderer.invoke('db:getMill', id),
    addMill: (mill) => ipcRenderer.invoke('db:addMill', mill),
    updateMill: (id, mill) => ipcRenderer.invoke('db:updateMill', id, mill),
    deleteMill: (id) => ipcRenderer.invoke('db:deleteMill', id),

    // Vehicles
    getVehicles: (params) => ipcRenderer.invoke('db:getVehicles', params),
    addVehicle: (vehicle) => ipcRenderer.invoke('db:addVehicle', vehicle),
    updateVehicle: (id, vehicle) => ipcRenderer.invoke('db:updateVehicle', id, vehicle),
    deleteVehicle: (id) => ipcRenderer.invoke('db:deleteVehicle', id),

    // Loads
    getLoads: (params) => ipcRenderer.invoke('db:getLoads', params),
    getLoad: (id) => ipcRenderer.invoke('db:getLoad', id),
    addLoad: (load) => ipcRenderer.invoke('db:addLoad', load),

    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('db:getDashboardStats'),

    // Backup/Restore
    backup: () => ipcRenderer.invoke('db:backup'),
    restore: () => ipcRenderer.invoke('db:restore')
});
