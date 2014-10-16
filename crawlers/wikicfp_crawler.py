import requests
from scrapy.http import HtmlResponse
import re, json
# from conference import *
from category import *
import cgi
import datetime

categories_file_loc = "../categories.json"
title_R      = re.compile(r'<a.*>(.*?)</a>', re.U)
full_title_R = re.compile(r'<td align="left" colspan="3">(.*?)</td>', re.U)
url_R        = re.compile(r'href=[\'"]?([^\'" >]+)', re.U)
conf_info_R  = re.compile(r'<td align="left">(.*?)<\/td>', re.U)
wikiCFPURL = 'http://www.wikicfp.com/cfp/call'
wikiCFPBaseURL = 'http://www.wikicfp.com'
gMapsURL = 'https://maps.googleapis.com/maps/api/geocode/json'
xpath_for_table = "/html/body/div[4]/center/form/table/tr/td/table/tr"
conferences = {}
google_maps_api_key = "AIzaSyAl4FRVY9SvAZKkvxnH3PEm0POBoI6ddJY"
invalid_locations = ['n/a', 'publication', '', ' ', 'online']

def parseWikiCFP(OLD_DATASTORE, cat):
  finished = False
  print 'crawling ' + cat
  for x in range(1, 10):
    try:
      # print "page: " + str(x)
      userdata = {"conference": cat, "page": x}
      tr_list = HtmlResponse(
        url=wikiCFPURL,
        body=requests.get(wikiCFPURL, params=userdata).text,
        encoding = 'utf-8').selector.xpath(xpath_for_table).extract()[2:-1]

      for i in xrange(0, len(tr_list)-1, 2):
        tr1 = tr_list[i].replace('\n', '').encode('utf-8')
        tr2 = tr_list[i+1].replace('\n', '').encode('utf-8')

        if "Expired CFPs" in tr1:
          finished = True
          break

        conf_title = cgi.escape(title_R.search(tr1).group(1)).decode('utf-8')
        conf_title_key = conf_title.lower().strip()
        if conf_title_key in conferences.keys():
          if cat not in (conferences[conf_title_key])["categories"]:
            conferences[conf_title_key]["categories"].append(cat)
        elif conf_title_key in OLD_DATASTORE["conferences"].keys():
          conferences[conf_title_key] = OLD_DATASTORE["conferences"][conf_title_key]
        else:
          conf_full_title = cgi.escape(full_title_R.search(tr1).group(1))
          conf_url        = cgi.escape(wikiCFPBaseURL + url_R.search(tr1).group(1))
          loc_info        = conf_info_R.findall(tr2)
          conf_date       = cgi.escape(loc_info[0])
          conf_location   = loc_info[1].decode('utf-8')
          conf_submission = cgi.escape(loc_info[2])
          try:
            # raise Exception()
            userdata = {"address": "None"}
            response = {"status": "None"}
            if conf_location.lower().strip() not in invalid_locations:
              userdata = {"address": conf_location.strip(), "key": google_maps_api_key}
              response = requests.get(gMapsURL, params=userdata)

              if 'OK' == response.json()["status"]:
                conf_loc_info = response.json()["results"][0]["geometry"]["location"]
                conference = pSucks(conf_title, conf_full_title, conf_url, conf_date, conf_location, conf_submission, conf_loc_info["lat"], conf_loc_info["lng"], cat)
              else:
                print response.json()
                raise Exception()
            else:
              raise Exception()
              # raise Exception("Failed to get coordinates for \'" + userdata["address"] + " <><><> " + conf_location + "\', No results returned!")
          except Exception, e:
            if e.message:
              print e
            conference = pSucks(conf_title, conf_full_title, conf_url, conf_date, conf_location, conf_submission, 0, 0, cat)
          conferences[conf_title_key] = conference
      if finished: break
    except Exception, e:
      print e

def pSucks(conf_title,conf_full_title,conf_url,conf_date,conf_location,conf_submission,lat,lng, category):
  confDict = {}
  confDict["title"] = conf_title
  confDict["full_title"] = conf_full_title
  confDict["url"] = conf_url
  confDict["date"] = conf_date
  confDict["location"] = conf_location
  confDict["submission"] = conf_submission
  confDict["lat"] = lat
  confDict["lng"] = lng
  confDict["categories"] = [category]
  return confDict

def main():
  with open(categories_file_loc,'r') as f:
    list_of_wiki_cfp_categories = json.loads(f.read())

  old_file_ = open('../db.json', 'r')
  OLD_DATASTORE = json.loads(old_file_.read())
  old_file_.close()

  for cat in list_of_wiki_cfp_categories["categories"]:
    parseWikiCFP(OLD_DATASTORE, cat.lower().strip())
    print '... completed :)'

  jsonDatabase = '{"last_updated": "' + str(datetime.datetime.now()) + '","conferences":'
  jsonDatabase += json.dumps(conferences, default=lambda o: o.__dict__)
  jsonDatabase += '}'
  new_file_ = open('../db.json', 'w')
  new_file_.write(jsonDatabase)
  new_file_.close()

if __name__ == '__main__':
  main()