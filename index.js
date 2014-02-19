var builder = require('xmlbuilder')
  , Ad = require('./lib/ad');

var CompanionAdsRequiredNMTOKENS = {
  'all' : true,
  'any' : true,
  'none': true
};

var ResourceTypes = {
  'StaticResource': true,
  'IFrameResource': true,
  'HTMLResource': true
};

var TrackingEventNMTOKENS = {
  'creativeView' : true,
  'start' : true,
  'firstQuartile': true,
  'midpoint': true,
  'thirdQuartile': true,
  'complete': true,
  'mute': true,
  'unmute': true,
  'pause': true,
  'rewind': true,
  'resume': true,
  'fullscreen': true,
  'exitFullscreen': true,
  'expand': true,
  'collapse': true, 
  'acceptInvitation': true,
  'close': true,
  'skip': true,
  'progress': true
};

function VAST(settings) {
  settings = settings || {};
  this.version = settings.version || '3.0';

  this.VASTErrorURI = settings.VASTErrorURI;
  this.ads = [];
};

VAST.prototype.attachAd = function(settings) {
    var ad = new Ad(settings);
    this.ads.push(ad);
    return ad; 
};

VAST.prototype.addAbstractImpression = function(parent, track, data) {
  if (track) {
    return parent.element('Impression').cdata(data.url);
  }
  return null;
};

VAST.prototype.addInLineImpression = function(parent, track, data) {
    var impressionElement = this.addAbstractImpression(parent, track, data);
    if (impressionElement && typeof data.id !== 'undefined') {
      impressionElement.att('id', data.id);
    }
    return impressionElement;
};

/* for the sake of validity, wrapper impressions should not have id */
VAST.prototype.addWrapperImpression = function(parent, track, data) {
    return this.addAbstractImpression(parent, track, data);
};

VAST.prototype.addAbstractCreative = function(parent, data) {
    var creativeAttr = {};
    if (typeof data.id !== 'undefined') creativeAttr.id = data.id;
    if (typeof data.sequence !== 'undefined') creativeAttr.sequence = data.sequence;
    if (typeof data.AdID !== 'undefined') creativeAttr.AdID = data.AdID;
    return parent.element('Creative', creativeAttr);
};

VAST.prototype.addInLineCompanionAdCreative = function(parent, data) {
    var creative = this.addAbstractCreative(parent, data)
      , companionAdAttr = {};
    if (typeof data.required !== 'undefined' && data.required in CompanionAdsRequiredNMTOKENS) companionAdAttr.required = data.required;
    var companionAd = creative.element('CompanionAds', companionAdAttr);
    data.resources.forEach(this.addInLineCompanion.bind(this, companionAd));
    return companionAd;
};

VAST.prototype.addWrapperCompanionAdCreative = function(parent, data) {
    var creative = this.addAbstractCreative(parent, data)
      , companionAd = creative.element('CompanionAds');
    data.resources.forEach(this.addWrapperCompanion.bind(this, companionAd));
    return companionAd;
};

VAST.prototype.addAbstractCompanion = function(parent, data) {
  var attributes = data.attributes
    , companionAttr = {
        'width': data.width,
        'height': data.height
  };
  if (typeof attributes.id !== 'undefined') companionAttr.id = attributes.id;
  if (typeof attributes.assetWidth !== 'undefined') companionAttr.assetWidth = attributes.assetWidth;
  if (typeof attributes.assetHeight !== 'undefined') companionAttr.assetHeight = attributes.assetHeight;
  if (typeof attributes.expandedWidth !== 'undefined') companionAttr.expandedWidth = attributes.expandedWidth;
  if (typeof attributes.expandedHeight !== 'undefined') companionAttr.expandedHeight = attributes.expandedHeight;
  if (typeof attributes.apiFramework !== 'undefined') companionAttr.apiFramework = attributes.apiFramework;
  if (typeof attributes.adSlotId !== 'undefined') companionAttr.adSlotId = attributes.adSlotId;
  var companion = parent.element('Companion', companionAttr);
  data.resources.forEach(this.addResource.bind(this, companion));
  if (typeof data.adParameters !== 'undefined') companion.element('AdParameters', data.adParameters.data, { xmlEncoded : r.adParameters.xmlEncoded });
  if (typeof data.altText !== 'undefined') companion.element('AltText', data.altText);
  if (typeof data.companionClickThrough !== 'undefined') companion.element('CompanionClickThrough', data.companionClickThrough);
  return companion;
};

VAST.prototype.addInLineCompanion = function(parent, data) {
  return this.addAbstractCompanion(parent, data);
  // this should have companion click tracking
};

VAST.prototype.addWrapperCompanion = function(parent, data) {
  return this.addAbstractCompanion(parent, data);
};

VAST.prototype.addResource = function(parent, data) {
  if (!data.type in ResourceTypes) {
    return null;
  }
  return this['add' + data.type].call(this, parent, data);
};

VAST.prototype.addStaticResource = function(parent, data) {
  var attr = {};
  if (typeof data.creativeType !== 'undefined') attr.creativeType = data.creativeType;
  return parent.element('StaticResource', data.uri, attr);
};

VAST.prototype.addIFrameResource = function(parent, data) {
  return parent.element('IFrameResource', data.uri);
};

VAST.prototype.addHTMLResource = function(parent, data) {
  var attr = {};
  if (typeof data.xmlEncoded !== 'undefined') attr.xmlEncoded = data.xmlEncoded;
  return parent.element('HTMLResource', data.data, attr);
};

VAST.prototype.xml = function(options) {
  options = options || {};
  var track = (typeof options.track === 'undefined') ? true : options.track;
  var response = builder.create('VAST', { version : '1.0', encoding : 'UTF-8' });
  response.att('version', this.version);
  if (this.ads.length === 0 && this.VASTErrorURI)
    return response.element('Error').cdata(this.VASTErrorURI).end(options);
  this.ads.forEach(function(ad){
    var adOptions = { id : ad.id };
    if (ad.sequence) adOptions.sequence = ad.sequence;
    var Ad = response.element('Ad', adOptions)
      , adElementName = (ad.structure.toLowerCase() === 'wrapper') ? 'Wrapper' : 'InLine'
      , adElement = Ad.element(adElementName);
    adElement.element('AdSystem', ad.AdSystem.name, { version : ad.AdSystem.version });
    var creatives = adElement.element('Creatives');
    var linearCreatives = ad.creatives.filter(function(c) { return c.type === 'Linear' });
    var nonLinearCreatives = ad.creatives.filter(function(c) { return c.type === 'NonLinear' });
    var companionAdCreatives = ad.creatives.filter(function(c) { return c.type === 'CompanionAd' });
    
    companionAdCreatives.forEach(this['add' + adElementName + 'CompanionAdCreative'].bind(this, creatives));
    
    if (adElementName === 'Wrapper') {
      adElement.element('VASTAdTagURI', ad.VASTAdTagURI);
      ad.impressions.forEach(this.addWrapperImpression.bind(this, adElement, track));
      return;
    } else {
      adElement.element('AdTitle', ad.AdTitle);
      adElement.element('Description', ad.Description);
      ad.impressions.forEach(this.addInLineImpression.bind(this, adElement, track));
      ad.surveys.forEach(function(survey) {
        var attributes = {};
        if (survey.type) attributes.type = survey.type;
        adElement.element('Survey', survey.url, attributes);
      });
    }
    
    linearCreatives.forEach(function(c) {
      var creative = creatives.element('Creative', c.attributes)
        , creativeType;
      creativeType = creative.element(c.type);
      if (c.icons.length > 0) var icons = creativeType.element('Icons');
      c.icons.forEach(function(i){
        var icon = icons.element('Icon', i.attributes);
        i.resources.forEach(function(r){
          icon.element(r.type, r.uri, (r.creativeType) ? { creativeType : r.creativeType } : {});
        });
      });
      creativeType.element('Duration', c.Duration);
      var trackingEvents = creativeType.element('TrackingEvents');
      c.trackingEvents.forEach(function(trackingEvent){
        if (track) trackingEvents.element('Tracking', trackingEvent.url, { event : trackingEvent.event });
      });
      if (c.AdParameters) creativeType.element('AdParameters').cdata(c.AdParameters);
      var videoClicks = creativeType.element('VideoClicks');
      c.videoClicks.forEach(function(videoClick){
        videoClicks.element(videoClick.type, videoClick.url, { id : videoClick.id });
      });
      var mediaFiles = creativeType.element('MediaFiles');
      c.mediaFiles.forEach(function(mediaFile) {
        mediaFiles.element('MediaFile', mediaFile.url, mediaFile.attributes);
      });
    });

    nonLinearCreatives.forEach(function(c){
      var nonLinearAds = creatives.element('Creative').element('NonLinearAds')
        , creativeType = nonLinearAds.element(c.type, c.attributes);
      c.resources.forEach(function(resource) {
        var attributes = {};
        if (resource.creativeType) attributes.creativeType = resource.creativeType;
        creativeType.element(resource.type, resource.uri, attributes);
      });
      c.clicks.forEach(function(click){
        creativeType.element(click.type, click.uri);
      });
      if (c.adParameters) creativeType.element('AdParameters', c.adParameters.data, { xmlEncoded : c.adParameters.xmlEncoded });
    });
    
  }.bind(this));
  return response.end(options);
};

module.exports = VAST;