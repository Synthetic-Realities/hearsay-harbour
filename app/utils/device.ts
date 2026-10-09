/**
 * Is this a smart TV's browser (Fire TV's Silk on AFT… devices, Samsung, LG, Android TV and others)?
 * TVs start in arcade / TV remote mode, call workshop mode "Play together" (with family-sized
 * prompts), and count the room's hands with big tiles instead of small − + counters.
 */
export function isTvBrowser() {
  return typeof navigator !== 'undefined'
    && /AFT[A-Z]|SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|Android TV|GoogleTV|CrKey|HbbTV|Roku|AppleTV|PhilipsTV|VIDAA/i.test(navigator.userAgent)
}
