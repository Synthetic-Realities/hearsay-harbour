/**
 * Is this a smart TV's browser (Fire TV's Silk on AFT… devices, Samsung, LG, Android TV and others)?
 * TVs start in arcade / TV remote mode, and don't offer workshop mode, whose room-vote counters
 * are too fiddly with a remote.
 */
export function isTvBrowser() {
  return typeof navigator !== 'undefined'
    && /AFT[A-Z]|SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|Android TV|GoogleTV|CrKey|HbbTV|Roku|AppleTV|PhilipsTV|VIDAA/i.test(navigator.userAgent)
}
