import requests
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
rest_re = re.compile(r'...list">(?!.*?<a)(.*?)</font>')
full_title_re = re.compile(r'<div align="left"(| title=".*?")>(?=.*?<a href)')
words_re = re.compile(r'(?:\s|\w)+')
conferences = {}
def run(repo, db):

    cfps = db["conferences"]
    conferences = repo["conferences"]
    today = str(date.today())
    url = 'http://grid.hust.edu.cn/call/deadline.jsp?time=all&after='+today+'&rows=1000'

    #titles = 
    h = HtmlResponse(
        url=url,
        body=requests.get(url).text,
        encoding = 'utf-8').selector.xpath('//table[@id =\'main\']').extract()[0]
    titles = title_re.findall(h)
    rest = rest_re.findall(h)
    full_titles = full_title_re.findall(h)
    #print h[500:1000]
    #print str(len(titles)), str(len(rest))
    for title_num in range(len(titles)):
        full_title = full_titles[title_num]
        if full_title:
            title = full_title[full_title.find('"')+1:full_title.rfind('"')]
        else:
            title = titles[title_num].replace('\'',' 20')
        cfpIdentifier = titles[title_num].replace('\'',' 20').lower()
        identifier = titles[title_num][:titles[title_num].find('\'')].lower()
        #title = titles[title_num].replace('\'',' 20')
        location = rest[4*title_num]
        publisher = words_re.findall(rest[4*title_num+1])
        if publisher:
            publisher = publisher[0]
        else:
            publisher = "None"
        deadline = rest[4*title_num+2]
        rank = ranks[len(rest[4*title_num+3])]
        
        if cfpIdentifier in cfps.keys():
            
            print "FOUND %s " % cfpIdentifier

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
            confDict["ranking"] = 0
            confDict["full_title"] = title
            confDict["type"] = publisher
            confDict["tier"] = rank
            conferences[identifier] = confDict
            
        #print "I: %s" % identifier
        #print "T: %s    |   L: %s  | P: %s | D: %s | R: %s " %(title,location,publisher,deadline,rank)
        
    f = open('../conference-repo2.json','w')
    f.write(json.dumps(repo))
    f.close()


if __name__ == '__main__':
    f = open('../conference-repo2.json','r')
    repo = json.loads(f.read())
    f.close()
    #print repo
    f2 = open('../db.json','r')
    db = json.loads(f2.read())
    f2.close()
    
    run(repo, db)
