# -*- coding: utf-8 -*-
import requests
from datetime import date
from scrapy.http import HtmlResponse
import re
import cgi
from conference import *
from category import *

ranks = { 0:'unknown', 3:'C', 4:'B', 5:'A'}
title_re = re.compile(r'<td.*?_blank">(.*?)</a')
rest_re = re.compile(r'...list">(?!.*?<a)(.*?)</font>')
def run():
    today = str(date.today())
    url = 'http://grid.hust.edu.cn/call/deadline.jsp?time=all&after='+today+'&rows=1000'

    #titles = 
    h = HtmlResponse(
        url=url,
        body=requests.get(url).text,
        encoding = 'utf-8').selector.xpath('//table[@id =\'main\']').extract()[0]
    titles = title_re.findall(h)
    rest = rest_re.findall(h)
    print h[500:1000]
    print str(len(titles)), str(len(rest))
    for title_num in range(len(titles)):
        title = titles[title_num].replace('\'',' 20')
        location = rest[4*title_num]
        publisher = rest[4*title_num+1]
        deadline = rest[4*title_num+2]
        rank = ranks[len(rest[4*title_num+3])]

        print "T: %s    |   L: %s  | P: %s | D: %s | R: %s " %(title,location,publisher,deadline,rank)
        
    


if __name__ == '__main__':
    run()
