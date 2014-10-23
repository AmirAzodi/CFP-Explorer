import requests
from urllib2 import unquote
from datetime import date
from scrapy.http import HtmlResponse
import re
import cgi
from conference import *
from category import *
import json
import pprint

ranks = { 0:'unknown', 3:'C', 4:'B', 5:'A'}
title_re = re.compile(r'<td.*?_blank">(.*?)</a')
rest_re = re.compile(r'...list">(?!.*?<a)(?:&nbsp;|\xa0|\xa8){0,3}(.*?)</font>')
full_title_re = re.compile(r'<div align="left"(| title=".*?")>(?=.*?<a href)')

urls_re = re.compile(r'url=(.*?)"')
conferences = {}
gMapsURL = 'https://maps.googleapis.com/maps/api/geocode/json'
google_maps_api_key = "AIzaSyAxQx5RvskYSPxNQzVvhUYe4YRfJFCCEkE"
invalid_locations = ['n/a', 'publication', '', ' ', 'online', 'special issue']

def run(repo, db):

    cfps = db["conferences"]
    conferences = repo["conferences"]
    today = str(date.today())
    url = 'http://grid.hust.edu.cn/call/deadline.jsp?time=all&after='+today+'&rows=1000'


    h = HtmlResponse(
        url=url,
        body=requests.get(url).text,
        encoding = 'utf-8').selector.xpath('//table[@id =\'main\']').extract()[0]

    titles = title_re.findall(h)
    rest = rest_re.findall(h)

    full_titles = full_title_re.findall(h)
    urls = [unquote(url) for url in urls_re.findall(h)]

    for title_num in range(len(titles)):

        full_title = full_titles[title_num]
        if full_title:
            title = full_title[full_title.find('"')+1:full_title.rfind('"')]
        else:
            title = titles[title_num].replace('\'',' 20')
        cfpIdentifier = titles[title_num].replace('\'',' 20').lower().strip()
        identifier = titles[title_num][:titles[title_num].find('\'')].lower().strip()

        location = rest[4*title_num]
        publisher = rest[4*title_num+1]
        deadline = rest[4*title_num+2]
        rank = ranks[len(rest[4*title_num+3])]
        url = urls[title_num]
        if cfpIdentifier in cfps.keys():
            if len(cfps[cfpIdentifier]["full_title"])<len(title):
                cfps[cfpIdentifier]["full_title"] = title
            #print "FOUND %s " % cfpIdentifier
        else:
            confDict = {}
            cfps[cfpIdentifier] = {}
            cfps[cfpIdentifier]["submission"] = deadline
            cfps[cfpIdentifier]["url"] = url
            cfps[cfpIdentifier]["date"] = "Unknown"
            cfps[cfpIdentifier]["title"] = titles[title_num].replace('\'',' 20')
            cfps[cfpIdentifier]["full_title"] = full_title
            cfps[cfpIdentifier]["location"] = location

            cfps[cfpIdentifier]["lat"] = 0
            cfps[cfpIdentifier]["lng"] = 0
            cfps[cfpIdentifier]["categories"] = ['computer science']
            if location.lower() not in invalid_locations:
                #print location.lower()
                userdata = {"address": location.strip(), "key": google_maps_api_key}
                response = requests.get(gMapsURL, params=userdata)
                if 'OK' == response.json()["status"]:
                    conf_loc_info = response.json()["results"][0]["geometry"]["location"]

                    cfps[cfpIdentifier]["lat"] = conf_loc_info["lat"]
                    cfps[cfpIdentifier]["lng"] = conf_loc_info["lng"]
                else:
                    print "Invalid Response:"
                    print response.json()

            #print "CREATED: %s" % cfpIdentifier

        if identifier in conferences.keys():
            #print "FOUND %s " % identifier
            if len(conferences[identifier]["full_title"])<len(title):
                conferences[identifier]["full_title"] = title
            if conferences[identifier]["tier"] == "None":
                conferences[identifier]["tier"] = rank
            if conferences[identifier]["type"] == "None":
                conferences[identifier]["type"] = publisher

        else:
            confDict = {}
            confDict["ranking"] = 'Unknown'
            confDict["full_title"] = title
            confDict["type"] = publisher
            confDict["tier"] = rank
            conferences[identifier] = confDict

        #print "I: %s" % identifier
        #print "T: %s    |   L: %s  | P: %s | D: %s | R: %s " %(title,location,publisher,deadline,rank)

    f = open('../www/conference-repo.json','w')
    f.write(json.dumps(repo))
    f.close()
    f2 = open('../www/db.json','w')
    f2.write(json.dumps(db))
    f2.close()


if __name__ == '__main__':
    f = open('../www/conference-repo.json','r')
    repo = json.loads(f.read())
    f.close()
    #print repo
    f2 = open('../www/db.json','r')
    db = json.loads(f2.read())
    f2.close()

    run(repo, db)
