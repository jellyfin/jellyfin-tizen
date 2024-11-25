/*(

  function () {
    'use strict';
*/
import { Service } from 'wrt:service';

var pkg_id = tizen.application.getCurrentApplication().appInfo.packageId;
var service_id = pkg_id + ".service";
var localJsonData = undefined;


function create_title_json(title_data) {

  var action_data =
  {
    serverid: title_data.ServerId,
    id: title_data.Id
  };


  var obj = {
    title: "S"+title_data.ParentIndexNumber+":E"+title_data.IndexNumber+" - "+title_data.Name,
    subtitle: "Subtitle",
    image_ratio: "1by1",
    image_url: "https://artworks.thetvdb.com/banners/fanart/original/78901-80.jpg",
    //image_url: "http://192.168.31.62:8096/Items/5f6a38a4adfd66d4d3e838f0bb19e050/Images/Thumb?fillHeight=122&fillWidth=216&format=jpg&quality=96&tag=3e557bd01b366b69311d41a555d2bd96",
    action_data: JSON.stringify(action_data), // Escaped JSON string
    is_playable: true
  };
  return obj
}

function create_smart_view_json(data) {
  var obj = {
    sections: [
      {
        title: "Ajanlott",
        tiles: [create_title_json(data[0])]
      },
      {
        title: "Folytasd",
        tiles: [
          create_title_json(data[1]),
          create_title_json(data[2]),
          create_title_json(data[3]),
          create_title_json(data[4]),
        ]
      }
    ]
  };
  return obj
}

function send_message_to_service() {

  try {
    tizen.application.launchAppControl(
      new tizen.ApplicationControl(
        'http://tizen.org/appcontrol/operation/pick',
        null,
        'image/jpeg',
        null,
        [
          new tizen.ApplicationControlData('caller', [JSON.stringify(localJsonData)]),
          new tizen.ApplicationControlData('Preview', [JSON.stringify(localJsonData)])
        ]
      ),
      service_id,
      () => console.log('Message: ' + JSON.stringify(localJsonData) + ' sent to ' + service_id),
      (error) => console.error('Launch failed:', error.message)
    );
  } catch (error) {
    console.error("Error sending message:", error);

  }
}


var OnReceived = function (ui_data) {
  console.log("Received Data in Service : " + ui_data[0].value);
};

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}


var local_message_port = tizen.messageport.requestLocalMessagePort(pkg_id + ".DataChannel");
var message_port_listener = local_message_port.addMessagePortListener(OnReceived);


var interval = setInterval(function () {
  // get elem
  if (typeof ApiClient == 'undefined') return;
  clearInterval(interval);
  const address = ApiClient.getResumableItems(ApiClient.getCurrentUserId())
    .then((response) => {
      return response.Items;
    });

  const printAddress = async () => {
    const a = await address;

    console.log(JSON.stringify(create_smart_view_json(a)));
    localJsonData = create_smart_view_json(a);

    delay(2000).then(() => {
      console.log('ran after 2 second1 passed');
      send_message_to_service(localJsonData);
    });

    /*delay(6000).then(() => {
      console.log('ran after 6 second1 passed');
      send_message_to_service(localJsonData);
    });*/
  };


  var my_service = new Service(service_id);
  my_service.start().then(function () {
    console.log("Succeeded to start service333");
  },
    function (error) {
      console.log("Failed to start service: " + error);

    });

  printAddress();




  // the rest of the code
}, 1000);

/*
  }
)();
*/