import requests
from scrapy.http import HtmlResponse
import re, json
from conference import *
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
categories = []
conferences = []
google_maps_api_key = "AIzaSyAxQx5RvskYSPxNQzVvhUYe4YRfJFCCEkE"

def parseWikiCFP(cat):
  conferences = []
  finished = False
  print 'crawling ' + cat
  for x in range(1, 10):
    try:
      print "page: " + str(x)
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

        conf_title      = cgi.escape(title_R.search(tr1).group(1))
        conf_full_title = cgi.escape(full_title_R.search(tr1).group(1))
        conf_url        = cgi.escape(wikiCFPBaseURL + url_R.search(tr1).group(1))
        loc_info        = conf_info_R.findall(tr2)
        conf_date       = cgi.escape(loc_info[0])
        conf_location   = loc_info[1]
        conf_submission = cgi.escape(loc_info[2])

        try:
          userdata = {"address": "None"}
          response = {"status": "None"}
          some_list = ['n/a', 'publication', '', ' ', 'online']
          if conf_location.lower() not in some_list:
            userdata = {"address": conf_location.strip(), "key": google_maps_api_key}
            response = requests.get(gMapsURL, params=userdata)
            if 'OK' == response.json()["status"]:
              conf_loc_info = response.json()["results"][0]["geometry"]["location"]
              conference = Conference(conf_title, conf_full_title, conf_url, conf_date, conf_location, conf_submission, conf_loc_info["lat"], conf_loc_info["lng"])
            else:
              print response.json()
              raise Exception("Failed to get coordinates for \'" + userdata["address"] + "\', Response not OK!")
          else:
            raise Exception()
            # raise Exception("Failed to get coordinates for \'" + userdata["address"] + " <><><> " + conf_location + "\', No results returned!")
        except Exception, e:
          if e.message:
            print e
          conference = Conference(conf_title, conf_full_title, conf_url, conf_date, conf_location, conf_submission, 0, 0)
        conferences.append(conference)
      if finished: break
    except Exception, e:
      print e
  category = Category(cat, conferences)
  categories.append(category)

def main():
  with open(categories_file_loc,'r') as f:
    output = f.read()
  data = json.loads(output)
  for cat in data["categories"]:
    parseWikiCFP(cat)
    print '... completed :)'
  jsonDatabase = '{"last_updated": "' + str(datetime.datetime.now()) + '","db":'
  jsonDatabase += json.dumps(categories, default=lambda o: o.__dict__)
  jsonDatabase += '}'
  file_ = open('../db.json', 'w')
  file_.write(jsonDatabase)
  file_.close()

if __name__ == '__main__':
  main()