var CompanionAd = require('./companion-ad')
  , Icon = require('./icon')
  , TrackingEvent = require('./tracking-event')

function Creative(type, settings) {
  settings = settings || {};
  this.type = type;
  this.AdParameters = settings.AdParameters;
  if (settings.Duration) {
    this.Duration = settings.Duration;    
  } else if (type === 'Linear') {
    throw new Error('A Duration is required for all creatives. Consider defaulting to "00:00:00"');
  }
  this.attributes = {};
  if (type !== 'Linear') {
    /*
    if (typeof settings.width !== "undefined") {
      this.attributes.width = settings.width;
    } else {
      throw new Error("Width attribute is required for Creative element. Consider defaulting to 0.");
    }
    if (typeof settings.height !== "undefined") {
      this.attributes.height = settings.height;
    } else {
      throw new Error("Height attribute is required for Creative element. Consider defaulting to 0.");
    }
    */
  }
  /*
  if (settings.id) this.attributes.id = settings.id;
  if (settings.sequence) this.attributes.sequence = settings.sequence;
  if (settings.AdID) this.attributes.AdID = settings.AdID;
  if (settings.expandedWidth) this.attributes.expandedWidth = settings.expandedWidth;
  if (settings.expandedHeight) this.attributes.expandedHeight = settings.expandedHeight;
  if (settings.scalable !== undefined) this.attributes.scalable = settings.scalable;
  if (settings.maintainAspectRatio !== undefined) this.attributes.maintainAspectRatio = settings.maintainAspectRatio;
  if (settings.minSuggestedDuration) this.attributes.minSuggestedDuration = settings.minSuggestedDuration;
  if (settings.apiFramework) this.attributes.apiFramework = settings.apiFramework;
  */
  this.mediaFiles = [];  
  this.trackingEvents = [];
  this.videoClicks = [];
  this.clickThroughs = [];
  this.clicks = [];
  this.resources = [];
  this.icons = [];

};

Creative.prototype.attachMediaFile = function(url, settings) {
  settings = settings || {};
  var mediaFile = { attributes : {} };
  mediaFile.url = url;
  mediaFile.attributes.type = settings.type || 'video/mp4';
  mediaFile.attributes.width = settings.width || '640';
  mediaFile.attributes.height = settings.height || '360';
  mediaFile.attributes.delivery = settings.delivery || 'progressive';
  
  if (!settings.id)
    throw new Error('an `id` is required for all media files');
  
  mediaFile.attributes.id = settings.id;
  if (settings.bitrate) mediaFile.attributes.bitrate = settings.bitrate;
  if (settings.minBitrate) mediaFile.attributes.minBitrate = settings.minBitrate;
  if (settings.maxBitrate) mediaFile.attributes.maxBitrate = settings.maxBitrate;
  if (settings.scalable !== undefined) mediaFile.attributes.scalable = settings.scalable;
  if (settings.maintainAspectRatio) mediaFile.attributes.maintainAspectRatio = settings.maintainAspectRatio;
  if (settings.codec) mediaFile.attributes.codec = settings.codec;
  if (settings.apiFramework) mediaFile.attributes.apiFramework = settings.apiFramework;
  
  this.mediaFiles.push(mediaFile);
  
  return this;
};

Creative.prototype.attachTrackingEvent = function(type, url) {
  this.trackingEvents.push(new TrackingEvent(type, url));
  return this;
};

Creative.prototype.attachVideoClick = function(type, url, id) {
  var VALID_VIDEO_CLICKS = ['ClickThrough', 'ClickTracking', 'CustomClick'];
  if (VALID_VIDEO_CLICKS.indexOf(type) < 0) { 
    throw new Error('The supplied VideoClick `type` is not a valid VAST VideoClick type.');
  }
  this.videoClicks.push({ type : type, url : url, id : id || '' });
  return this;
};

Creative.prototype.attachClickThrough = function(url) {  
  this.clickThroughs.push(url);
  return this;
};

Creative.prototype.attachClick = function(uri, type) {
  if (typeof uri === 'string') type = 'NonLinearClickThrough';
  this.clicks = [{ type : type, uri : uri }];
  return this;
};

Creative.prototype.adParameters = function(data, xmlEncoded) {
  this.adParameters = { data : data, xmlEncoded : xmlEncoded };
  return this;
};

Creative.prototype.attachResource = function(type, uri, creativeType) {
  var resource = { type : type, uri : uri };
  if (type === 'HTMLResource') resource.html = uri;
  if (creativeType) resource.creativeType = creativeType;
  this.resources.push(resource);
  return this;
};

Creative.prototype.attachIcon = function(settings) {
  var icon = new Icon(settings);
  this.icons.push(icon);
  return icon;
};

module.exports = Creative;