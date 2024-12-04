(function () {

  var packageId = tizen.application.getCurrentApplication().appInfo.packageId;
  var serviceId = packageId + ".service";
  var smartViewJsonData = undefined;
  var remoteMessagePort = undefined;

/**
 * Creates a JSON object representing one title for the smart view.
 * 
 * @param {Object} title_data - The title data containing details about the media items.
 * @param {string} title_data.ServerId - The server ID associated with the media.
 * @param {string} title_data.Id - The unique ID of the media item.
 * @param {number} title_data.ParentIndexNumber - The parent index number of the media.
 * @param {number} title_data.IndexNumber - The index number of the media.
 * @param {string} title_data.Name - The name of the media item.
 * @param {string} title_data.SeriesName - The series name of the media item.
 * @param {string} title_data.ParentBackdropItemId - The ID for the backdrop image.
 * @param {Object} title_data.UserData - User-specific data, including played percentage.
 * @param {number} title_data.UserData.PlayedPercentage - Percentage of the media played.
 * @returns {Object|null} The formatted title JSON object or `null` if data is invalid.
 */
  function generateTitleJson(title_data) {

    if (!title_data) {
      console.warn("Missing title_data");
      return null;
    }

    var action_data =
    {
      serverid: title_data.ServerId,
      id: title_data.Id
    };
    var title = null;

    var playedPercentage = "";

    if (title_data.UserData && title_data.UserData.PlayedPercentage) {
      playedPercentage = "&percentPlayed=" + title_data.UserData.PlayedPercentage;
    }
    
    if(title_data.Type =="Episode"){
      title = {
      title: "S" + title_data.ParentIndexNumber + ":E" + title_data.IndexNumber + " - " + title_data.Name,
      subtitle: title_data.SeriesName,
      image_ratio: "16by9",
      image_url: ApiClient.serverAddress() + "/Items/" + title_data.ParentBackdropItemId + "/Images/Backdrop?format=jpg&quality=96&fillHeight=250" + playedPercentage,
      action_data: JSON.stringify(action_data),
      is_playable: true
    };}
    else if(title_data.Type =="Movie"){
      title = {
        title: title_data.Name,
        image_ratio: "16by9",
        image_url: ApiClient.serverAddress() +"/Items/" + title_data.Id + "/Images/Thumb?format=jpg&quality=96&fillHeight=250" + playedPercentage,
        action_data: JSON.stringify(action_data),
        is_playable: true
      };
    }
    return title;
  }


/**
 * Creates a JSON object for the smart view containing multiple sections and their tiles.
 * 
 * @param {Array<Object>} sectionsData - Array of objects representing each section's metadata and content.
 * @param {string} sectionsData[].section_title - Title of the section (e.g., "Next Up", "Continue Watching").
 * @param {number} sectionsData[].limit - Maximum number of items to include in the section.
 * @param {Array<Object>} sectionsData[].data - Array of media items to populate the section's tiles.
 * 
 * @returns {Object} A JSON object with `sections` for the smart view.
 *                   Each section contains a title and an array of tiles.
 *                   If no valid sections are provided, the returned object will have an empty `sections` array.
 */
  function generateSmartViewJson(sectionsData) {
 

    // Validate input data
    if (!Array.isArray(sectionsData) || sectionsData.length === 0) {
      console.warn("Invalid or empty sections data.");
      return { sections: [] };
    }

     // Initialize the smart view JSON object
    var smart_view_json = { sections: [] };

     // Populate Sections
     sectionsData.forEach(section => {
      if (Array.isArray(section.data) && section.data.length > 0) {
        const tiles = section.data.slice(0, section.limit).map(generateTitleJson).filter(Boolean);
        if (tiles.length > 0) {
          smart_view_json.sections.push({
            title: section.section_title,
            tiles: tiles
          });
        }
      }
    });

      return smart_view_json;
    }


  /**
   * Launches the Tizen application control to start a service
   * 
   * @throws {Error} Logs any error encountered during the service launch process.
  */
  function startService() {
    try {
      tizen.application.launchAppControl(
        new tizen.ApplicationControl(
          'http://tizen.org/appcontrol/operation/pick',
          null,
          'image/jpeg',
          null,
          [
            new tizen.ApplicationControlData('caller', ["JSON.stringify(smartViewJsonData)"]),
            new tizen.ApplicationControlData('Preview', ["JSON.stringify(smartViewJsonData)"])
          ]
        ),
        serviceId,
        () => console.log('Message sent to ' + serviceId),
        (error) => console.error('Launch failed:', error.message)
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }


  /**
   * Sends a key-value message to the Tizen service using the message port.
   * 
   * @param {string} key - The key for the message.
   * @param {string} value - The value for the message.
   */
  function sendMessageToService(key, value) {
    if (remoteMessagePort === undefined) {
      remoteMessagePort = tizen.messageport.requestRemoteMessagePort(serviceId, "DATACHANNEL");
    }

    if (remoteMessagePort) {
      remoteMessagePort.sendMessage([{ key, value }]);
    }
    else {
      console.error("Message port is undefined");
    }
  }


  /**
   * Sends a smart view update request to the service.
   * 
   * @param {Object} smartViewJsonData - The smart view data to send.
  */
  function sendSmartViewUpdateRequest(smartViewJsonData) {
    sendMessageToService('Preview', JSON.stringify(smartViewJsonData));

  }


  /**
   * Callback function for receiving messages from the Tizen service.
   * 
   * @param {Array<Object>} ui_data - The received data array from the service.
   */
  var OnReceived = function (ui_data) {
    console.log("Received Data in Service : " + ui_data[0].value);
    if (ui_data[0].value == 'Service exiting...')
      window.scriptReady = true;
  };


  /**
   * Delays execution for a specified time.
   * 
   * @param {number} time - Time in milliseconds to delay.
   * @returns {Promise} A promise that resolves after the specified delay.
   */
  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }


  var localMessagePort = tizen.messageport.requestLocalMessagePort("DATACHANNEL");
  localMessagePort.addMessagePortListener(OnReceived);


  var interval = setInterval(function () {
  
    if (typeof ApiClient == 'undefined') return;
    clearInterval(interval);
    const fetchData = async () => {
      try {
        const [resumableItems, nextUpEpisodes] = await Promise.all([
          ApiClient.getResumableItems(ApiClient.getCurrentUserId()),
          ApiClient.getNextUpEpisodes(ApiClient.getCurrentUserId())
        ]);
  
        // Generate smart view data
        smartViewJsonData = generateSmartViewJson([
          { section_title: "Next Up", limit: 2, data: nextUpEpisodes.Items },
          { section_title: "Continue Watching", limit: 4, data: resumableItems.Items }
        ]);
        console.log("Generated SmartViewResult: \n" + JSON.stringify(smartViewJsonData));
  
        // Delay and send the smart view update request
        await delay(2000);
        sendSmartViewUpdateRequest(smartViewJsonData);
      } catch (error) {
        console.error("Error fetching data: ", error);
        window.scriptReady = true;
      }
    };
  
    // Start the service and fetch the data
    startService();
    fetchData();

  }, 1000);


}
)();
