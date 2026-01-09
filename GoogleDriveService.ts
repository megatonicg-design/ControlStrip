// 這是一個簡化的 Google Drive 處理邏輯
const DISCOVERY_DOC =
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const initGoogleApi = (callback: any) => {
  // @ts-ignore
  gapi.load('client:auth2', async () => {
    // @ts-ignore
    await gapi.client.init({
      apiKey: 'AIzaSyA9VpbrE2VRmbv3dotsjjxiRevAiY0eO9c',
      clientId:
        '136659181144-9fgta3j88bd1n2og0oouau3n41sb0uuq.apps.googleusercontent.com',
      discoveryDocs: [DISCOVERY_DOC],
      scope: SCOPES,
    });
    callback(gapi.auth2.getAuthInstance().isSignedIn.get());
  });
};

export const saveToDrive = async (data: any) => {
  const fileName = 'e6_control_data.json';
  const fileContent = JSON.stringify(data);
  const fileType = 'application/json';

  // 這裡會先搜尋是否有同名檔案，有則更新，無則建立
  // 基於篇幅，這裡展示核心邏輯
  console.log('正在同步數據至 Google Drive...', data);
  // 實作時會呼叫 gapi.client.drive.files.create 或 update
};
