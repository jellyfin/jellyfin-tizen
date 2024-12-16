
  var packageId = tizen.application.getCurrentApplication().appInfo.packageId;
  var serviceId = packageId + ".service";
  var smartViewJsonData = undefined;
  var remoteMessagePort = undefined;
  var localMessagePort = undefined;
  var messagePortListener = undefined;





/** Get the URL of the card's image.
 * @param {Object} item - Item for which to generate tileimageurk
 * @returns {CardImageUrl} Object representing the URL of the card's image.
 */
function getTileImageUrl(item) {
  item = item.ProgramInfo || item;

  options ={
    preferThumb: true,
    inheritThumb: true,
  }

  preferThumb = true;
  let height = 250;
  let imgUrl = null;
  let imgTag = null;
  let imgType = null;
  let itemId = null;

  /* eslint-disable sonarjs/no-duplicated-branches */
  if (options.preferThumb && item.ImageTags && item.ImageTags.Thumb) {
      imgType = 'Thumb';
      imgTag = item.ImageTags.Thumb;
  } else if (options.preferThumb && item.SeriesThumbImageTag && options.inheritThumb !== false) {
      imgType = 'Thumb';
      imgTag = item.SeriesThumbImageTag;
      itemId = item.SeriesId;
  } else if (options.preferThumb && item.ParentThumbItemId && options.inheritThumb !== false && item.MediaType !== 'Photo') {
      imgType = 'Thumb';
      imgTag = item.ParentThumbImageTag;
      itemId = item.ParentThumbItemId;
  } else if (options.preferThumb && item.BackdropImageTags && item.BackdropImageTags.length) {
      imgType = 'Backdrop';
      imgTag = item.BackdropImageTags[0];
      forceName = true;
  } else if (options.preferThumb && item.ParentBackdropImageTags && item.ParentBackdropImageTags.length && options.inheritThumb !== false && item.Type === 'Episode') {
      imgType = 'Backdrop';
      imgTag = item.ParentBackdropImageTags[0];
      itemId = item.ParentBackdropItemId;
  } else if (item.ImageTags && item.ImageTags.Primary && (item.Type !== 'Episode' || item.ChildCount !== 0)) {
      imgType = 'Primary';
      imgTag = item.ImageTags.Primary;

      if (primaryImageAspectRatio && uiAspect) {
          coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= 0.2;
      }
  } else if (item.SeriesPrimaryImageTag) {
      imgType = 'Primary';
      imgTag = item.SeriesPrimaryImageTag;
      itemId = item.SeriesId;
  } else if (item.PrimaryImageTag) {
      imgType = 'Primary';
      imgTag = item.PrimaryImageTag;
      itemId = item.PrimaryImageItemId;

      if (primaryImageAspectRatio && uiAspect) {
          coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= 0.2;
      }
  } else if (item.ParentPrimaryImageTag) {
      imgType = 'Primary';
      imgTag = item.ParentPrimaryImageTag;
      itemId = item.ParentPrimaryImageItemId;
  } else if (item.AlbumId && item.AlbumPrimaryImageTag) {
      imgType = 'Primary';
      imgTag = item.AlbumPrimaryImageTag;
      itemId = item.AlbumId;

      if (primaryImageAspectRatio && uiAspect) {
          coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= 0.2;
      }
  } else if (item.Type === 'Season' && item.ImageTags && item.ImageTags.Thumb) {
      imgType = 'Thumb';
      imgTag = item.ImageTags.Thumb;
  } else if (item.BackdropImageTags && item.BackdropImageTags.length) {
      imgType = 'Backdrop';
      imgTag = item.BackdropImageTags[0];
  } else if (item.ImageTags && item.ImageTags.Thumb) {
      imgType = 'Thumb';
      imgTag = item.ImageTags.Thumb;
  } else if (item.SeriesThumbImageTag && options.inheritThumb !== false) {
      imgType = 'Thumb';
      imgTag = item.SeriesThumbImageTag;
      itemId = item.SeriesId;
  } else if (item.ParentThumbItemId && options.inheritThumb !== false) {
      imgType = 'Thumb';
      imgTag = item.ParentThumbImageTag;
      itemId = item.ParentThumbItemId;
  } else if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length && options.inheritThumb !== false) {
      imgType = 'Backdrop';
      imgTag = item.ParentBackdropImageTags[0];
      itemId = item.ParentBackdropItemId;
  }
  /* eslint-enable sonarjs/no-duplicated-branches */

  if (!itemId) {
      itemId = item.Id;
  }

  if (imgTag && imgType) {
      var params = {
        type: imgType,
        fillHeight: height,
        quality: 96,
        tag: imgTag,
        format: "jpg"
      };
      var playedPercentage = item && item.UserData && item.UserData.PlayedPercentage;
      if (playedPercentage !== null && playedPercentage !== undefined) {
        params.percentPlayed = playedPercentage;
      }
      imgUrl = ApiClient.getScaledImageUrl(itemId, params);
  }

  return imgUrl;

}



  
/**
 * Creates a JSON object representing one title for the smart view.
 * 
 * @param {Object} title_data - The title data containing details about the media items.
 * @param {string} title_data.ServerId - The server ID associated with the media.
 * @param {string} title_data.Id - The unique ID of the "Episode"
 * @param {number} title_data.ParentIndexNumber - The "Series" index number of the media.
 * @param {number} title_data.IndexNumber - The index number of the media.
 * @param {string} title_data.Name - The name of the Movie
 * @param {string} title_data.SeriesName - The name of the Series
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

    var imgURL = getTileImageUrl(title_data);

    
    if(title_data.Type =="Episode"){

      action_data.type = 'episode';
      action_data.seasonid = title_data.SeasonId;
      action_data.seriesid = title_data.SeriesId;
      series_episode = "";
      if (title_data.ParentIndexNumber !== undefined  && title_data.IndexNumber !== undefined)
        series_episode = "S" + title_data.ParentIndexNumber + ":E" + title_data.IndexNumber + " - " 

      title = {
      title: series_episode + title_data.Name,
      subtitle: title_data.SeriesName,
      image_ratio: "16by9",
      image_url: imgURL,
      action_data: JSON.stringify(action_data),
      is_playable: true
    };}
    else if(title_data.Type =="Movie"){
      action_data.type = 'movie';
      title = {
        title: title_data.Name,
        image_ratio: "16by9",
        image_url: imgURL,
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
   * Launches the Tizen application and send Smartview data
   * 
   * @param {Object} smartViewJsonData - The title data containing details about the media items.
   * @throws {Error} Logs any error encountered during the service launch process.
  */
  function startServiceAndUpdateSmartView(smartViewJsonData) {
    console.log('Starting Service'),
    localMessagePort = tizen.messageport.requestLocalMessagePort(packageId);
    messagePortListener = localMessagePort.addMessagePortListener(OnReceived);
    try {
      tizen.application.launchAppControl(
        new tizen.ApplicationControl(
          'http://tizen.org/appcontrol/operation/pick',
          null,
          'image/jpeg',
          null,
          [
            new tizen.ApplicationControlData('Preview', [JSON.stringify(smartViewJsonData)])
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
   * Callback function for receiving messages from the Tizen service.
   * 
   * @param {Array<Object>} ui_data - The received data array from the service.
   */
  var OnReceived = function (ui_data) {
    console.log("Received Data from Service : " + ui_data[0].value);
    if (ui_data[0].value == 'Service stopping...' || ui_data[0].value == 'Service exiting...'){
      window.smartHubUpdated = true;
      localMessagePort.removeMessagePortListener(messagePortListener);

    }
  };

  const waitForSmartHubUpdate = () => {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (window.smartHubUpdated === true) {
                clearInterval(interval); 
                resolve(); 
            }
        }, 100); 
    });
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

  (async function runSmartViewUpdater() {
  
    while (typeof ApiClient === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  

    const runSmartViewUpdate = async () => {
      window.smartHubUpdated = false;
      try {
        const [resumableItems, nextUpEpisodes] = await Promise.all([
          ApiClient.getResumableItems(ApiClient.getCurrentUserId()),
          ApiClient.getNextUpEpisodes(ApiClient.getCurrentUserId())
        ]);
  
        // Generate smart view data
        const smartViewJsonData = generateSmartViewJson([
          { section_title: "Next Up", limit: 2, data: nextUpEpisodes.Items },
          { section_title: "Continue Watching", limit: 4, data: resumableItems.Items }
        ]);
  
        console.log("Generated SmartViewResult: \n" + JSON.stringify(smartViewJsonData));
  
        // Delay and send the smart view update request
        await delay(2000);
        startServiceAndUpdateSmartView(smartViewJsonData);
        await waitForSmartHubUpdate();
  
      } catch (error) {
        console.error("Error fetching data: ", error);
        window.smartHubUpdated = true;
      }
    };
  
    window.runSmartViewUpdate = runSmartViewUpdate;
    
    // Refresh SmartView every 10min.
    while (true) {
      const startTime = Date.now();
  
      await runSmartViewUpdate();
  
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(600000 - elapsedTime, 0);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
  })();


