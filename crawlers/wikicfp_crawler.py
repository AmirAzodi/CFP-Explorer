import requests
from scrapy.http import HtmlResponse
import re, json
import cgi
import datetime

categories_file_loc = "categories.json"
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
invalid_locations = ['n/a', 'publication', '', ' ', 'online', 'special issue', 'none']

def parseWikiCFP(OLD_DATASTORE, cat):
  finished = False
  gmaps_counter = 0
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
        conf_title_key = " ".join(conf_title.lower().split())
        if conf_title_key in conferences.keys():
          if cat not in (conferences[conf_title_key])["categories"]:
            conferences[conf_title_key]["categories"].append(cat)
        elif conf_title_key in OLD_DATASTORE["conferences"].keys():
          conf_full_title = " ".join(cgi.escape(full_title_R.search(tr1).group(1)).split())
          conf_url        = cgi.escape(wikiCFPBaseURL + url_R.search(tr1).group(1))
          loc_info        = conf_info_R.findall(tr2)
          conf_date       = cgi.escape(loc_info[0])
          conf_location   = " ".join(loc_info[1].decode('utf-8').split())
          conf_submission = cgi.escape(loc_info[2])
          old_lat = OLD_DATASTORE["conferences"][conf_title_key]["lat"]
          old_lng = OLD_DATASTORE["conferences"][conf_title_key]["lng"]
          old_country = OLD_DATASTORE["conferences"][conf_title_key]["country"]
          conferences[conf_title_key] = pSucks(conf_title, conf_full_title, conf_url, conf_date, conf_location, conf_submission, old_lat, old_lng, cat, old_country)
        else:
          conf_full_title = " ".join(cgi.escape(full_title_R.search(tr1).group(1)).split())
          conf_url        = cgi.escape(wikiCFPBaseURL + url_R.search(tr1).group(1))
          loc_info        = conf_info_R.findall(tr2)
          conf_date       = cgi.escape(loc_info[0])
          conf_location   = " ".join(loc_info[1].decode('utf-8').split())
          conf_submission = cgi.escape(loc_info[2])

          conference = pSucks(conf_title, conf_full_title, conf_url, conf_date, conf_location, conf_submission, 0, 0, cat, "Unknown")

          userdata = {"address": "None"}
          response = {"status": "None"}
          if conf_location.lower() not in invalid_locations:

            userdata = {"address": conf_location, "key": google_maps_api_key}
            response = requests.get(gMapsURL, params=userdata)
            gmaps_counter  += 1
            if 'OK' == response.json()["status"]:
              result = response.json()["results"][0]
              conf_loc_info = result["geometry"]["location"]
              country = result["formatted_address"][result["formatted_address"].rfind(',')+1:].strip()
              if '-' in country:
                country = country[country.rfind('-')+1:].strip()
              if conf_loc_info["lat"] == 0 and conf_loc_info["lng"] == 0:
                print ">>>" + conf_title
              conference = pSucks(conf_title,conf_full_title,conf_url,conf_date,conf_location,conf_submission,conf_loc_info["lat"],conf_loc_info["lng"],cat,country)
              print country
            else:
              print response.json()
          conferences[conf_title_key] = conference
      if finished:
        print "number of gmaps requests: " + str(gmaps_counter)
        break
    except Exception, e:
      print e

def pSucks(conf_title,conf_full_title,conf_url,conf_date,conf_location,conf_submission,lat,lng, category, country):
  confDict = {}
  confDict["title"] = conf_title
  confDict["full_title"] = conf_full_title.replace('title=\"','').replace('\"','')
  confDict["url"] = conf_url
  confDict["date"] = conf_date
  confDict["location"] = conf_location
  confDict["submission"] = conf_submission
  confDict["lat"] = lat
  confDict["lng"] = lng
  confDict["categories"] = [category]
  confDict["country"] = country
  return confDict

def main():
  with open(categories_file_loc,'r') as f:
    list_of_wiki_cfp_categories = json.loads(f.read())

  old_file_ = open('../www/db.json', 'r')
  OLD_DATASTORE = json.loads(old_file_.read())
  old_file_.close()

  for cat in list_of_wiki_cfp_categories["categories"]:
    parseWikiCFP(OLD_DATASTORE, cat.lower().strip())
    print '... completed :)'

  jsonDatabase = '{"last_updated": "' + str(datetime.datetime.now()) + '","conferences":'
  jsonDatabase += json.dumps(conferences, default=lambda o: o.__dict__)
  jsonDatabase += '}'
  new_file_ = open('../www/db.json', 'w')
  new_file_.write(jsonDatabase)
  new_file_.close()

if __name__ == '__main__':
  main()
