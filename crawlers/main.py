import os

def main():
  print "starting first crawler"
  os.system('python wikicfp_crawler.py > ../log/phdmate_wikicfp.log')
  print "starting second crawler"
  os.system('python semex_cfp.py > ../log/phdmate_semex.log')

if __name__ == '__main__':
  main()
