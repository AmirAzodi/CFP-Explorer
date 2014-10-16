class Conference:
  def __init__(self,conf_title,conf_full_title,conf_url,conf_date,conf_location,conf_submission,lat,lng, category):
    self.categories = []
    self.title      = conf_title
    self.full_title = conf_full_title
    self.url        = conf_url
    self.date       = conf_date
    self.location   = conf_location
    self.submission = conf_submission
    self.lat = lat
    self.lng = lng
    self.categories.append(category)